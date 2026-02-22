import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: 'Email dan password harus diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { outlet: true },
    });

    if (!user) return NextResponse.json({ message: 'Email tidak ditemukan' }, { status: 401 });
    if (user.password !== password) return NextResponse.json({ message: 'Password salah' }, { status: 401 });

    return NextResponse.json({
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
        outlet: user.outlet ? { id: user.outlet.id, nama: user.outlet.nama } : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan server' }, { status: 500 });
  }
}