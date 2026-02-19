import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { stok: { gt: 0 } },
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ message: 'Gagal memuat produk' }, { status: 500 });
  }
}
