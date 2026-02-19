import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const outletId = searchParams.get('outletId');

    if (search) {
      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { barcode: search },
            { sku: search },
            { nama: { contains: search, mode: 'insensitive' } },
          ],
          ...(outletId ? { outletId } : {}),
        },
        include: { category: true },
      });
      return NextResponse.json({ product });
    }

    const products = await prisma.product.findMany({
      where: {
        ...(outletId ? { outletId } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, barcode, hargaJual, stok, categoryId, foto } = body;

    // Validasi
    if (!nama || !hargaJual || !categoryId) {
      return NextResponse.json(
        { error: 'Nama, harga, dan kategori harus diisi' },
        { status: 400 }
      );
    }

    // Ambil outlet pertama (sesuaikan jika pakai auth)
    const outlet = await prisma.outlet.findFirst();
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 400 });
    }

    // Generate SKU otomatis
    const count = await prisma.product.count();
    const sku = `SKU-${String(count + 1).padStart(5, '0')}`;

    const product = await prisma.product.create({
      data: {
        nama,
        sku,
        barcode: barcode || null,
        hargaJual,
        hargaBeli: 0,
        stok,
        categoryId,
        outletId: outlet.id,
        foto: foto || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ product });
  } catch (error: any) {
    console.error('Error creating product:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Barcode sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan produk' }, { status: 500 });
  }
}
