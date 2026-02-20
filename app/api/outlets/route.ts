import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// GET /api/outlets - mengambil semua outlet
export async function GET() {
  try {
    const outlets = await prisma.outlet.findMany({
      select: {
        id: true,
        nama: true,
        alamat: true,
        telepon: true
      }
    });

    return NextResponse.json(outlets);
  } catch (error) {
    console.error('Error fetching outlets:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data outlet' },
      { status: 500 }
    );
  }
}

// POST /api/outlets - membuat outlet baru (opsional)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama, alamat, telepon } = body;

    if (!nama) {
      return NextResponse.json(
        { error: 'Nama outlet harus diisi' },
        { status: 400 }
      );
    }

    const outlet = await prisma.outlet.create({
      data: {
        nama,
        alamat,
        telepon
      }
    });

    return NextResponse.json(outlet, { status: 201 });
  } catch (error) {
    console.error('Error creating outlet:', error);
    return NextResponse.json(
      { error: 'Gagal membuat outlet' },
      { status: 500 }
    );
  }
}