import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { pembelian: true } } },
      orderBy: { nama: 'asc' },
    });
    return NextResponse.json({ suppliers });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat suppliers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { nama, telepon, alamat } = await request.json();
    if (!nama) return NextResponse.json({ message: 'Nama supplier harus diisi' }, { status: 400 });

    // Ambil outletId dari outlet pertama (sesuaikan jika pakai auth session)
    const outlet = await prisma.outlet.findFirst();
    if (!outlet) return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: { nama, telepon: telepon || null, alamat: alamat || null, outletId: outlet.id },
    });
    return NextResponse.json({ supplier });
  } catch {
    return NextResponse.json({ message: 'Gagal membuat supplier' }, { status: 500 });
  }
}