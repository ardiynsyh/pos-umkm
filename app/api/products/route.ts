import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    if (search) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { barcode: search },
            { sku: search },
            { nama: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          category: true,
        },
      });

      return NextResponse.json({ product });
    }

    const products = await prisma.product.findMany({
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}