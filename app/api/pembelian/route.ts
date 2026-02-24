// app/api/pembelian/route.ts
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

    const pembelian = await prisma.pembelian.findMany({
      where: {
        // Pembelian punya tenantId langsung di schema
        ...(tenantId && { tenantId }),
        ...(startDate && endDate && { tanggal: { gte: startDate, lt: endDate } }),
      },
      include: {
        supplier: { select: { nama: true } },
        items: { include: { product: { select: { nama: true } } } },
      },
      orderBy: { tanggal: 'desc' },
    });

    return NextResponse.json({ pembelian });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat pembelian' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { supplierId, tanggal, items, total, dibayar, keterangan } = await req.json();
    if (!supplierId || !items?.length) {
      return NextResponse.json({ message: 'Supplier dan item harus diisi' }, { status: 400 });
    }

    const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
    if (!outlet) return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 400 });

    const totalDibayar = parseFloat(dibayar) || 0;
    const sisaHutang = Math.max(0, total - totalDibayar);
    const status = sisaHutang === 0 ? 'LUNAS' : totalDibayar > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS';

    const pembelian = await prisma.$transaction(async (tx) => {
      const newPembelian = await tx.pembelian.create({
        data: {
          tanggal: new Date(tanggal),
          supplierId,
          total,
          dibayar: totalDibayar,
          sisaHutang,
          status,
          keterangan: keterangan || null,
          outletId: outlet.id,
          tenantId, // ← Pembelian punya tenantId langsung di schema
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              jumlah: item.jumlah,
              hargaBeli: item.hargaBeli,
              subtotal: item.subtotal,
            })),
          },
        },
        include: { supplier: true, items: { include: { product: true } } },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stok: { increment: item.jumlah }, hargaBeli: item.hargaBeli },
        });
      }

      if (sisaHutang > 0) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { hutang: { increment: sisaHutang } },
        });
      }

      return newPembelian;
    });

    return NextResponse.json({ pembelian });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Gagal menyimpan pembelian' }, { status: 500 });
  }
}