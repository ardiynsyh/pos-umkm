import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal memuat kategori' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { nama, deskripsi } = await request.json();
    if (!nama) {
      return NextResponse.json({ error: 'Nama kategori harus diisi' }, { status: 400 });
    }
    const category = await prisma.category.create({
      data: { nama, deskripsi: deskripsi || null },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: 'Gagal membuat kategori' }, { status: 500 });
  }
}
