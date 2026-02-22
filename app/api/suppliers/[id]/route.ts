import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { nama, telepon, alamat } = await request.json();
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { nama, telepon: telepon || null, alamat: alamat || null },
    });
    return NextResponse.json({ supplier });
  } catch (error: any) {
    if (error.code === 'P2025') return NextResponse.json({ message: 'Supplier tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ message: 'Gagal mengupdate supplier' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    // Cek apakah ada pembelian
    const count = await prisma.pembelian.count({ where: { supplierId: id } });
    if (count > 0) {
      return NextResponse.json({ message: `Supplier tidak bisa dihapus karena memiliki ${count} data pembelian` }, { status: 400 });
    }
    await prisma.supplier.delete({ where: { id } });
    return NextResponse.json({ message: 'Supplier berhasil dihapus' });
  } catch (error: any) {
    if (error.code === 'P2025') return NextResponse.json({ message: 'Supplier tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ message: 'Gagal menghapus supplier' }, { status: 500 });
  }
}