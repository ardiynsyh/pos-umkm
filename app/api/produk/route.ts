// app/api/produk/route.ts
// ✅ Fix: Admin mengakses /api/produk tapi route tidak ada → buat route ini
// Route ini menangani produk dengan fallback outletId untuk role ADMIN
// (Admin mungkin tidak punya outletId spesifik, sehingga perlu ambil semua outlet di tenant)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search   = searchParams.get('search');
    const outletId = searchParams.get('outletId');

    const tenantFilter = tenantId ? { tenantId } : {};

    // ✅ Fix bug Admin: jika outletId dikirim tapi tidak ada produk di outlet itu,
    // fallback ke semua produk milik tenant (Admin bisa lihat semua produk)
    // Untuk KASIR: tetap filter by outletId
    const isAdminOrAbove = role === 'ADMIN' || role === 'MANAGER' || role === 'SUPERADMIN';

    // Tentukan filter outlet:
    // - KASIR → wajib filter by outletId
    // - ADMIN/MANAGER → gunakan outletId jika ada, tapi jika tidak ada produk → tampilkan semua produk tenant
    let outletFilter: { outletId?: string } = {};

    if (outletId) {
      if (isAdminOrAbove) {
        // Cek dulu apakah ada produk di outlet ini
        const countInOutlet = await prisma.product.count({
          where: { ...tenantFilter, outletId },
        });

        // Jika tidak ada produk di outlet spesifik, Admin lihat semua produk tenant
        if (countInOutlet > 0) {
          outletFilter = { outletId };
        }
        // else: outletFilter tetap kosong → tampilkan semua produk tenant
      } else {
        // Kasir: selalu filter by outletId
        outletFilter = { outletId };
      }
    }

    if (search) {
      const product = await prisma.product.findFirst({
        where: {
          ...tenantFilter,
          ...outletFilter,
          OR: [
            { barcode: search },
            { sku:     search },
            { nama:    { contains: search, mode: 'insensitive' } },
          ],
        },
        include: { category: true },
      });
      return NextResponse.json({ product });
    }

    const products = await prisma.product.findMany({
      where: {
        ...tenantFilter,
        ...outletFilter,
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[GET /api/produk]', error);
    return NextResponse.json({ error: 'Gagal memuat produk' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nama, barcode, hargaJual, stok, categoryId, foto, outletId } = await req.json();

    if (!nama || !hargaJual || !categoryId) {
      return NextResponse.json(
        { error: 'Nama, harga, dan kategori harus diisi' },
        { status: 400 }
      );
    }

    // Ambil outlet: gunakan outletId dari body jika ada, fallback ke outlet pertama tenant
    let resolvedOutletId = outletId;
    if (!resolvedOutletId) {
      const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
      if (!outlet) {
        return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 400 });
      }
      resolvedOutletId = outlet.id;
    }

    const count = await prisma.product.count({ where: { tenantId } });
    const sku   = `SKU-${String(count + 1).padStart(5, '0')}`;

    const product = await prisma.product.create({
      data: {
        nama, sku,
        barcode:   barcode   || null,
        hargaJual,
        hargaBeli: 0,
        stok:      stok      ?? 0,
        categoryId,
        outletId:  resolvedOutletId,
        tenantId,
        foto:      foto      || null,
      },
      include: { category: true },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/produk]', error);
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return NextResponse.json({ error: 'Barcode sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Gagal menyimpan produk' }, { status: 500 });
  }
}