// app/api/products/route.ts
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
    const search   = searchParams.get('search');
    const outletId = searchParams.get('outletId');

    const tenantFilter = tenantId ? { tenantId } : {};

    if (search) {
      const product = await prisma.product.findFirst({
        where: {
          ...tenantFilter,
          OR: [
            { barcode: search },
            { sku: search },
            { nama: { contains: search, mode: 'insensitive' } },
          ],
          ...(outletId && { outletId }),
        },
        include: { category: true },
      });
      return NextResponse.json({ product });
    }

    const products = await prisma.product.findMany({
      where: { ...tenantFilter, ...(outletId && { outletId }) },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nama, barcode, hargaJual, stok, categoryId, foto } = await req.json();
    if (!nama || !hargaJual || !categoryId) {
      return NextResponse.json({ error: 'Nama, harga, dan kategori harus diisi' }, { status: 400 });
    }

    // Ambil outlet milik tenant ini
    const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
    if (!outlet) {
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 400 });
    }

    const count = await prisma.product.count({ where: { tenantId } });
    const sku = `SKU-${String(count + 1).padStart(5, '0')}`;

    const product = await prisma.product.create({
      data: {
        nama, sku, barcode: barcode || null, hargaJual,
        hargaBeli: 0, stok, categoryId,
        outletId: outlet.id,
        tenantId,          // ← inject tenantId
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