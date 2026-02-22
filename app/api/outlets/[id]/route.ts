import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { nama, alamat, telepon } = await request.json();

    const outlet = await prisma.outlet.update({
      where: { id },
      data: { nama, alamat: alamat || null, telepon: telepon || null },
    });

    return NextResponse.json({ outlet });
  } catch (error: any) {
    if (error.code === 'P2025') return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ message: 'Gagal mengupdate outlet' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.outlet.delete({ where: { id } });
    return NextResponse.json({ message: 'Outlet berhasil dihapus' });
  } catch (error: any) {
    if (error.code === 'P2025') return NextResponse.json({ message: 'Outlet tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ message: 'Gagal menghapus outlet' }, { status: 500 });
  }
}