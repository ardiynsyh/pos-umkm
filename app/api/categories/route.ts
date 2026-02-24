// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// Category tidak punya tenantId di schema, tapi tetap perlu validasi auth
export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { nama, deskripsi } = await req.json();
    if (!nama) {
      return NextResponse.json({ error: 'Nama kategori harus diisi' }, { status: 400 });
    }
    const category = await prisma.category.create({
      data: { nama, deskripsi: deskripsi || null },
    });
    return NextResponse.json({ category });
  } catch {
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 });
  }
}