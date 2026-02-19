import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bulan = searchParams.get('bulan'); // format: YYYY-MM

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (bulan) {
      startDate = new Date(`${bulan}-01`);
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const data = await prisma.pengeluaran.findMany({
      where: {
        ...(startDate && endDate ? {
          tanggal: { gte: startDate, lt: endDate }
        } : {}),
      },
      orderBy: { tanggal: 'desc' },
    });

    // Format tanggal ke ISO string untuk frontend
    const formatted = data.map((item) => ({
      ...item,
      tanggal: item.tanggal.toISOString().slice(0, 10),
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Gagal memuat pengeluaran' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tanggal, kategori, keterangan, jumlah } = await request.json();

    if (!tanggal || !kategori || !keterangan || !jumlah) {
      return NextResponse.json({ message: 'Semua field harus diisi' }, { status: 400 });
    }

    const item = await prisma.pengeluaran.create({
      data: {
        tanggal: new Date(tanggal),
        kategori,
        keterangan,
        jumlah: Number(jumlah),
      },
    });

    return NextResponse.json({ data: item });
  } catch (error) {
    return NextResponse.json({ message: 'Gagal menyimpan pengeluaran' }, { status: 500 });
  }
}