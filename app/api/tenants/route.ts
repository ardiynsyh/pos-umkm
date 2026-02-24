// app/api/tenants/route.ts
// Hanya bisa diakses SUPERADMIN
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

// ── Helper: generate slug unik dari nama ─────────────────────────────────────
function generateSlug(nama: string): string {
  return nama
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

async function generateUniqueSlug(nama: string): Promise<string> {
  const base = generateSlug(nama);
  let slug   = base;
  let count  = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${count}`;
    count++;
  }
  return slug;
}

export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const tenants = await prisma.tenant.findMany({
      include: { _count: { select: { outlets: true, users: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error('[GET /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal mengambil data tenant' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const { nama, email, plan = 'FREE', maxOutlets = 1, adminNama, adminEmail, adminPassword } = await req.json();

    if (!nama)          return NextResponse.json({ message: 'Nama tenant wajib diisi' },    { status: 400 });
    if (!adminEmail)    return NextResponse.json({ message: 'Email admin wajib diisi' },    { status: 400 });
    if (!adminPassword) return NextResponse.json({ message: 'Password admin wajib diisi' }, { status: 400 });
    if (adminPassword.length < 8) return NextResponse.json({ message: 'Password minimal 8 karakter' }, { status: 400 });

    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) return NextResponse.json({ message: 'Email admin sudah terdaftar' }, { status: 400 });

    if (email) {
      const existingTenant = await prisma.tenant.findUnique({ where: { email } });
      if (existingTenant) return NextResponse.json({ message: 'Email bisnis sudah terdaftar' }, { status: 400 });
    }

    const slug = await generateUniqueSlug(nama);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { nama, slug, email: email || null, plan, maxOutlets: Number(maxOutlets) || 1 },
      });
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await tx.user.create({
        data: { nama: adminNama || nama, email: adminEmail, password: hashedPassword, role: 'ADMIN', tenantId: tenant.id },
      });
      return { tenant, admin };
    });

    return NextResponse.json({
      message: 'Tenant berhasil dibuat',
      tenant:  result.tenant,
      admin:   { id: result.admin.id, email: result.admin.email },
    });
  } catch (error) {
    console.error('[POST /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal membuat tenant', details: error instanceof Error ? error.message : 'Unknown' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id, plan, maxOutlets, maxUsers, nama, email, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'Tenant ID diperlukan' }, { status: 400 });
    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(plan       !== undefined && { plan }),
        ...(maxOutlets !== undefined && { maxOutlets: Number(maxOutlets) }),
        ...(maxUsers   !== undefined && { maxUsers:   Number(maxUsers) }),
        ...(nama       !== undefined && { nama }),
        ...(email      !== undefined && { email: email || null }),
        ...(isActive   !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('[PATCH /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal update tenant' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Tenant ID diperlukan' }, { status: 400 });
    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ message: 'Tenant berhasil dihapus' });
  } catch (error) {
    console.error('[DELETE /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal menghapus tenant' }, { status: 500 });
  }
}