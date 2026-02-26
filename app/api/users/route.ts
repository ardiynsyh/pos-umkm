// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTenantLimits } from '@/lib/tenant';
import bcrypt from 'bcrypt';

// Role yang boleh dibuat oleh ADMIN (tidak boleh buat SUPERADMIN atau sesama ADMIN)
const ALLOWED_ROLES_FOR_ADMIN = ['MANAGER', 'KASIR'];
const ALL_VALID_ROLES = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'];

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      where: tenantId ? { tenantId } : {},
      select: { id: true, nama: true, email: true, role: true, outletId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId    = req.headers.get('x-tenant-id');
  const requestRole = req.headers.get('x-user-role');

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Cek limit user sesuai plan
    const limits = await checkTenantLimits(tenantId);
    if (!limits?.canAddUser) {
      return NextResponse.json({
        message: `Batas user tercapai (${limits?.userCount}/${limits?.maxUsers}). Upgrade plan untuk menambah user.`,
      }, { status: 403 });
    }

    const { nama, email, password, role, outletId } = await req.json();

    if (!nama || !email || !password) {
      return NextResponse.json({ message: 'Nama, email, dan password harus diisi' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: 'Password minimal 8 karakter' }, { status: 400 });
    }

    // ✅ Validasi role
    const targetRole = role ?? 'KASIR';

    if (!ALL_VALID_ROLES.includes(targetRole)) {
      return NextResponse.json({ message: 'Role tidak valid' }, { status: 400 });
    }

    // ✅ ADMIN hanya boleh membuat MANAGER dan KASIR — tidak boleh SUPERADMIN atau ADMIN lain
    if (requestRole === 'ADMIN' && !ALLOWED_ROLES_FOR_ADMIN.includes(targetRole)) {
      return NextResponse.json({
        message: `Role ADMIN hanya boleh membuat user dengan role: ${ALLOWED_ROLES_FOR_ADMIN.join(', ')}`,
      }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });

    let finalOutletId = outletId;
    if (!finalOutletId) {
      const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
      finalOutletId = outlet?.id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nama,
        email,
        password: hashedPassword,
        role:     targetRole,
        outletId: finalOutletId,
        tenantId,
      },
      select: { id: true, nama: true, email: true, role: true, outletId: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    return NextResponse.json({ message: 'Gagal membuat user' }, { status: 500 });
  }
}
