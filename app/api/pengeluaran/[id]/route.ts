import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { tanggal, kategori, keterangan, jumlah } = await request.json();

    const item = await prisma.pengeluaran.update({
      where: { id },
      data: {
        tanggal: new Date(tanggal),
        kategori,
        keterangan,
        jumlah: Number(jumlah),
      },
    });

    return NextResponse.json({ data: item });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengupdate pengeluaran' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.pengeluaran.delete({ where: { id } });
    return NextResponse.json({ message: 'Berhasil dihapus' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus pengeluaran' }, { status: 500 });
  }
}