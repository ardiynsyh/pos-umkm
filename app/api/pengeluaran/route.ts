// app/api/pengeluaran/route.ts
// ✅ Tidak membutuhkan kolom `sumber` di database
//    Entri otomatis dari pembelian ditandai dengan kategori:
//    'Pembelian Stok' | 'Pembelian Stok (Sebagian)' | 'Pelunasan Hutang'
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Kategori yang otomatis dibuat dari pembelian — tidak bisa diedit/hapus dari sini
const KATEGORI_OTOMATIS = ['Pembelian Stok', 'Pembelian Stok (Sebagian)', 'Pelunasan Hutang'];

const isOtomatis = (kategori: string) => KATEGORI_OTOMATIS.includes(kategori);

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get('bulan');

    let startDate: Date | undefined;
    let endDate:   Date | undefined;
    if (bulan) {
      startDate = new Date(`${bulan}-01`);
      endDate   = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const dateWhere = startDate && endDate
      ? { tanggal: { gte: startDate, lt: endDate } }
      : {};

    // ── Single query, semua pengeluaran (manual + otomatis) ─────────────────
    const allRaw = await prisma.pengeluaran.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...dateWhere,
      },
      orderBy: { tanggal: 'desc' },
    });

    // Normalize — tandai sumber berdasarkan kategori (tidak perlu kolom sumber)
    const allData = allRaw.map(item => ({
      id:         item.id,
      tanggal:    item.tanggal.toISOString().slice(0, 10),
      kategori:   item.kategori,
      keterangan: item.keterangan,
      jumlah:     item.jumlah,
      source:     isOtomatis(item.kategori) ? 'pembelian' as const : 'manual' as const,
      createdAt:  item.createdAt.toISOString(),
    }));

    const manualData    = allData.filter(i => i.source === 'manual');
    const pembelianData = allData.filter(i => i.source === 'pembelian');

    // Ringkasan per kategori
    const perKategori = allData.reduce<Record<string, number>>((acc, item) => {
      acc[item.kategori] = (acc[item.kategori] || 0) + item.jumlah;
      return acc;
    }, {});

    return NextResponse.json({
      data:             manualData,
      pembelianData,
      perKategori,
      totalManual:      manualData.reduce((s, i) => s + i.jumlah, 0),
      totalPembelian:   pembelianData.reduce((s, i) => s + i.jumlah, 0),
      totalPengeluaran: allData.reduce((s, i) => s + i.jumlah, 0),
    });
  } catch (error) {
    console.error('[GET /api/pengeluaran]', error);
    return NextResponse.json({ message: 'Gagal memuat pengeluaran' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tanggal, kategori, keterangan, jumlah } = await req.json();
    if (!tanggal || !kategori || !keterangan || !jumlah) {
      return NextResponse.json({ message: 'Semua field harus diisi' }, { status: 400 });
    }

    // Cegah pengguna tambah manual dengan kategori yang sama dengan otomatis
    if (isOtomatis(kategori)) {
      return NextResponse.json(
        { message: 'Kategori ini otomatis dari pembelian, tidak bisa dibuat manual' },
        { status: 400 }
      );
    }

    const item = await prisma.pengeluaran.create({
      data: {
        tanggal:    new Date(tanggal),
        kategori,
        keterangan,
        jumlah:     Number(jumlah),
        tenantId,
      },
    });

    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ message: 'Gagal menyimpan pengeluaran' }, { status: 500 });
  }
}