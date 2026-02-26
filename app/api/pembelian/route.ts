// app/api/pembelian/route.ts
// ✅ Setiap pembelian berhasil → stok produk otomatis bertambah
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId  = searchParams.get('outletId');
    const supplierId = searchParams.get('supplierId');
    const status    = searchParams.get('status');

    const pembelian = await prisma.pembelian.findMany({
      where: {
        ...(tenantId   && { tenantId }),
        ...(outletId   && { outletId }),
        ...(supplierId && { supplierId }),
        ...(status     && { status: status as any }),
      },
      include: {
        supplier: { select: { id: true, nama: true } },
        items: {
          include: { product: { select: { id: true, nama: true, stok: true, satuan: true } } },
        },
      },
      orderBy: { tanggal: 'desc' },
    });

    // Summary hutang per supplier
    const hutangSummary = await prisma.pembelian.groupBy({
      by: ['supplierId'],
      where: {
        ...(tenantId && { tenantId }),
        status: { not: 'LUNAS' },
      },
      _sum: { sisaHutang: true },
    });

    return NextResponse.json({ pembelian, hutangSummary });
  } catch (error) {
    console.error('[GET /api/pembelian]', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Kasir tidak bisa tambah pembelian
  if (role === 'KASIR') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const {
      outletId, supplierId, tanggal, items,
      dibayar = 0, keterangan,
    } = await req.json();

    if (!outletId || !supplierId || !items?.length) {
      return NextResponse.json({ error: 'outletId, supplierId, dan items wajib diisi' }, { status: 400 });
    }

    const resolvedTenantId = tenantId ?? (await prisma.outlet.findUnique({ where: { id: outletId } }))?.tenantId;
    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 404 });
    }

    const total     = items.reduce((s: number, i: any) => s + i.subtotal, 0);
    const sisaHutang = total - dibayar;
    const status    = dibayar <= 0 ? 'BELUM_LUNAS' : dibayar >= total ? 'LUNAS' : 'SEBAGIAN';

    // ── Pembelian + update stok dalam 1 atomic operation ──────────────────────
    const pembelian = await prisma.$transaction(async (tx) => {
      // 1. Buat pembelian
      const pb = await tx.pembelian.create({
        data: {
          tanggal:   new Date(tanggal),
          total, dibayar, sisaHutang,
          status:    status as any,
          keterangan: keterangan ?? null,
          supplierId,
          outletId,
          tenantId: resolvedTenantId,
          items: {
            create: items.map((i: any) => ({
              productId: i.productId,
              jumlah:    i.jumlah,
              hargaBeli: i.hargaBeli,
              subtotal:  i.subtotal,
            })),
          },
        },
        include: {
          items:    { include: { product: { select: { nama: true } } } },
          supplier: { select: { nama: true } },
        },
      });

      // 2. ✅ Tambah stok setiap produk + update harga beli otomatis
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  {
            stok:     { increment: item.jumlah },
            hargaBeli: item.hargaBeli, // update harga beli terbaru
          },
        });
      }

      // 3. Update hutang supplier
      if (sisaHutang > 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data:  { hutang: { increment: sisaHutang } },
        });
      }

      return pb;
    });

    return NextResponse.json({ pembelian }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/pembelian]', error);
    return NextResponse.json({ error: 'Gagal membuat pembelian' }, { status: 500 });
  }
}

// Bayar hutang
export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, bayar } = await req.json();
    const pb = await prisma.pembelian.findUnique({ where: { id } });
    if (!pb) return NextResponse.json({ error: 'Pembelian tidak ditemukan' }, { status: 404 });

    const newDibayar  = pb.dibayar + bayar;
    const newSisa     = Math.max(pb.total - newDibayar, 0);
    const newStatus   = newDibayar >= pb.total ? 'LUNAS' : newDibayar > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS';

    const [updated] = await prisma.$transaction([
      prisma.pembelian.update({
        where: { id },
        data:  { dibayar: newDibayar, sisaHutang: newSisa, status: newStatus as any },
      }),
      prisma.supplier.update({
        where: { id: pb.supplierId },
        data:  { hutang: { decrement: bayar } },
      }),
    ]);

    return NextResponse.json({ pembelian: updated });
  } catch (error) {
    console.error('[PATCH /api/pembelian]', error);
    return NextResponse.json({ error: 'Gagal update pembayaran' }, { status: 500 });
  }
}