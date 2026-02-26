// app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcrypt';

const ALLOWED_ROLES_FOR_ADMIN = ['MANAGER', 'KASIR'];

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const tenantId    = req.headers.get('x-tenant-id');
  const requestRole = req.headers.get('x-user-role');

  if (!tenantId && requestRole !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await context.params;
    const { nama, email, password, role: newRole } = await req.json();

    if (!nama || !email) {
      return NextResponse.json({ message: 'Nama dan email harus diisi' }, { status: 400 });
    }

    if (password && password.length < 8) {
      return NextResponse.json({ message: 'Password minimal 8 karakter' }, { status: 400 });
    }

    // Pastikan user yang diedit masih dalam tenant yang sama (kecuali SUPERADMIN)
    if (tenantId) {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
      }
      if (target.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // ✅ ADMIN tidak boleh assign role SUPERADMIN atau ADMIN ke user lain
    if (requestRole === 'ADMIN' && newRole && !ALLOWED_ROLES_FOR_ADMIN.includes(newRole)) {
      return NextResponse.json({
        message: `Role ADMIN hanya boleh mengatur role: ${ALLOWED_ROLES_FOR_ADMIN.join(', ')}`,
      }, { status: 403 });
    }

    const duplicate = await prisma.user.findFirst({
      where: { email, NOT: { id: userId } },
    });
    if (duplicate) {
      return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    }

    const data: Record<string, any> = { nama, email };
    if (newRole) data.role = newRole;
    if (password) data.password = await bcrypt.hash(password, 10);

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
  req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const tenantId    = req.headers.get('x-tenant-id');
  const requestRole = req.headers.get('x-user-role');

  if (!tenantId && requestRole !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId } = await context.params;

    if (tenantId) {
      const target = await prisma.user.findUnique({ where: { id: userId } });
      if (!target) {
        return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
      }
      if (target.tenantId !== tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const requestingUserId = req.headers.get('x-user-id');
      if (requestingUserId && requestingUserId === userId) {
        return NextResponse.json({ message: 'Tidak dapat menghapus akun sendiri' }, { status: 400 });
      }
      // ✅ ADMIN tidak boleh hapus user SUPERADMIN
      if (requestRole === 'ADMIN' && target.role === 'SUPERADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await prisma.user.delete({ where: { id: userId } });
    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus user' }, { status: 500 });
  }
}