import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      include: {
        _count: { select: { users: true, products: true, tables: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ outlets });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat outlets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nama, alamat, telepon } = await request.json();
    if (!nama) return NextResponse.json({ message: 'Nama outlet harus diisi' }, { status: 400 });

    const outlet = await prisma.outlet.create({
      data: { nama, alamat: alamat || null, telepon: telepon || null },
    });

    return NextResponse.json({ outlet });
  } catch {
    return NextResponse.json({ message: 'Gagal membuat outlet' }, { status: 500 });
  }
}