// app/api/suppliers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      // Supplier punya tenantId langsung di schema
      where: tenantId ? { tenantId } : {},
      include: { _count: { select: { pembelian: true } } },
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json({ suppliers });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat suppliers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nama, telepon, alamat } = await req.json();
    if (!nama) return NextResponse.json({ message: 'Nama supplier harus diisi' }, { status: 400 });

    const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
    if (!outlet) return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: {
        nama,
        telepon: telepon || null,
        alamat: alamat || null,
        outletId: outlet.id,
        tenantId, // ← Supplier punya tenantId di schema
      },
    });
    return NextResponse.json({ supplier });
  } catch {
    return NextResponse.json({ message: 'Gagal membuat supplier' }, { status: 500 });
  }
}