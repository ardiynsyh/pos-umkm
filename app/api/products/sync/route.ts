import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        sku: true,
        barcode: true,
        nama: true,
        hargaJual: true,
        stok: true,
        categoryId: true,
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync products' },
      { status: 500 }
    );
  }
}