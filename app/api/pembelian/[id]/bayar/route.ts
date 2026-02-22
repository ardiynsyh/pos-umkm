import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { jumlah } = await request.json();

    if (!jumlah || jumlah <= 0) {
      return NextResponse.json({ message: 'Jumlah bayar tidak valid' }, { status: 400 });
    }

    const pembelian = await prisma.pembelian.findUnique({ where: { id } });
    if (!pembelian) return NextResponse.json({ message: 'Pembelian tidak ditemukan' }, { status: 404 });
    if (pembelian.status === 'LUNAS') return NextResponse.json({ message: 'Pembelian sudah lunas' }, { status: 400 });

    const bayar = Math.min(jumlah, pembelian.sisaHutang);
    const newDibayar = pembelian.dibayar + bayar;
    const newSisa = Math.max(0, pembelian.total - newDibayar);
    const newStatus = newSisa === 0 ? 'LUNAS' : newDibayar > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS';

    await prisma.$transaction(async (tx) => {
      await tx.pembelian.update({
        where: { id },
        data: { dibayar: newDibayar, sisaHutang: newSisa, status: newStatus },
      });
      // Kurangi hutang supplier
      await tx.supplier.update({
        where: { id: pembelian.supplierId },
        data: { hutang: { decrement: bayar } },
      });
    });

    return NextResponse.json({ message: 'Pembayaran berhasil', sisaHutang: newSisa, status: newStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Gagal memproses pembayaran' }, { status: 500 });
  }
}
