import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  req: Request,
  context: { params: Promise<{ usersId: string }> }
) {
  try {
    const { userId } = await context.params;
    const { nama, email, password, role } = await req.json();

    const data: any = { nama, email, role };
    if (password) data.password = password; // hanya update password jika diisi

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, nama: true, email: true, role: true, outletId: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Gagal mengupdate user' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus user' }, { status: 500 });
  }
}
