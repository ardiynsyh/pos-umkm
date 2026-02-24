// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { checkTenantLimits } from '@/lib/tenant';

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
  const tenantId = req.headers.get('x-tenant-id');
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });

    let finalOutletId = outletId;
    if (!finalOutletId) {
      const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
      finalOutletId = outlet?.id;
    }

    const user = await prisma.user.create({
      data: {
        nama, email, password,
        role: role ?? 'KASIR',
        outletId: finalOutletId,
        tenantId,             // ← inject tenantId
      },
      select: { id: true, nama: true, email: true, role: true, outletId: true, createdAt: true },
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.code === 'P2002') return NextResponse.json({ message: 'Email sudah digunakan' }, { status: 400 });
    return NextResponse.json({ message: 'Gagal membuat user' }, { status: 500 });
  }
}