import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        outletId: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat users' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { nama, email, password, role, outletId } = await req.json();

    if (!nama || !email || !password) {
      return NextResponse.json({ message: 'Nama, email, dan password harus diisi' }, { status: 400 });
    }

    // Cek email duplikat
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    }

    // Ambil outletId dari outlet pertama jika tidak disediakan
    let finalOutletId = outletId;
    if (!finalOutletId) {
      const outlet = await prisma.outlet.findFirst();
      finalOutletId = outlet?.id;
    }

    const user = await prisma.user.create({
      data: {
        nama,
        email,
        password, // pertimbangkan bcrypt untuk production
        role: role ?? 'KASIR',
        outletId: finalOutletId,
      },
      select: { id: true, nama: true, email: true, role: true, outletId: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Gagal membuat user' }, { status: 500 });
  }
}
