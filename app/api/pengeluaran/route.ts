// app/api/pengeluaran/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const bulan = searchParams.get('bulan');

    let startDate: Date | undefined, endDate: Date | undefined;
    if (bulan) {
      startDate = new Date(`${bulan}-01`);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const data = await prisma.pengeluaran.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(startDate && endDate && { tanggal: { gte: startDate, lt: endDate } }),
      },
      orderBy: { tanggal: 'desc' },
    });

    const formatted = data.map((item) => ({
      ...item,
      tanggal: item.tanggal.toISOString().slice(0, 10),
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error(error);
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

    const item = await prisma.pengeluaran.create({
      data: { tanggal: new Date(tanggal), kategori, keterangan, jumlah: Number(jumlah), tenantId },
    });

    return NextResponse.json({ data: item });
  } catch {
    return NextResponse.json({ message: 'Gagal menyimpan pengeluaran' }, { status: 500 });
  }
}