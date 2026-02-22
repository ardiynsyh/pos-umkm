import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const pembelian = await prisma.pembelian.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
      },
    });
    if (!pembelian) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ pembelian });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat data' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const pembelian = await prisma.pembelian.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!pembelian) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // Kurangi stok kembali
      for (const item of pembelian.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stok: { decrement: item.jumlah } },
        });
      }
      // Kurangi hutang supplier
      if (pembelian.sisaHutang > 0) {
        await tx.supplier.update({
          where: { id: pembelian.supplierId },
          data: { hutang: { decrement: pembelian.sisaHutang } },
        });
      }
      // Hapus pembelian (items terhapus cascade)
      await tx.pembelian.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Pembelian berhasil dihapus' });
  } catch {
    return NextResponse.json({ message: 'Gagal menghapus pembelian' }, { status: 500 });
  }
}