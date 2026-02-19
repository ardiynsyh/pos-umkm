import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;
    const body = await request.json();
    const { nama, barcode, hargaJual, stok, categoryId, foto } = body;

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        nama,
        barcode: barcode || null,
        hargaJual,
        stok,
        categoryId,
        foto: foto || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Error updating product:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Barcode sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Gagal mengupdate produk' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await context.params;

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ message: 'Produk berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Produk tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Gagal menghapus produk' }, { status: 500 });
  }
}
