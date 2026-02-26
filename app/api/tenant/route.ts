// app/api/tenants/route.ts
// ✅ 1 Admin hanya boleh memiliki 1 toko
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcrypt';

function generateSlug(nama: string): string {
  return nama.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base, counter = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${counter++}`;
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
      include: {
        _count: { select: { outlets: true, users: true } },
        // Ambil data admin toko (user dengan role ADMIN)
        users: {
          where: { role: 'ADMIN' },
          select: { id: true, nama: true, email: true },
          take: 1,
        },
      },
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
    const {
      nama, email, plan = 'FREE', maxOutlets = 1,
      adminNama, adminEmail, adminPassword,
    } = await req.json();

    if (!nama)          return NextResponse.json({ message: 'Nama toko wajib diisi' },       { status: 400 });
    if (!adminEmail)    return NextResponse.json({ message: 'Email admin wajib diisi' },      { status: 400 });
    if (!adminPassword) return NextResponse.json({ message: 'Password admin wajib diisi' },   { status: 400 });

    // ✅ Cek duplikat email admin
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      // ✅ Enforce 1 admin = 1 toko:
      // Jika email sudah terdaftar sebagai ADMIN yang sudah punya toko → tolak
      if (existingUser.role === 'ADMIN' && existingUser.tenantId) {
        const existingTenant = await prisma.tenant.findUnique({ where: { id: existingUser.tenantId } });
        return NextResponse.json({
          message: `Email ini sudah menjadi Admin toko "${existingTenant?.nama ?? 'lain'}". Satu Admin hanya boleh mengelola 1 toko.`,
        }, { status: 400 });
      }
      return NextResponse.json({ message: 'Email admin sudah terdaftar' }, { status: 400 });
    }

    // Cek duplikat email bisnis
    if (email) {
      const existingTenant = await prisma.tenant.findUnique({ where: { email } });
      if (existingTenant) {
        return NextResponse.json({ message: 'Email bisnis sudah terdaftar' }, { status: 400 });
      }
    }

    const slug = await uniqueSlug(generateSlug(nama));

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          nama, slug,
          email:      email || null,
          plan:       plan as any,
          maxOutlets: Number(maxOutlets) || 1,
        },
      });

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // ✅ Admin dibuat dengan tenantId langsung — tidak ada outletId (admin tidak terikat outlet)
      const admin = await tx.user.create({
        data: {
          nama:     adminNama || nama,
          email:    adminEmail,
          password: hashedPassword,
          role:     'ADMIN',
          tenantId: tenant.id,
          // outletId sengaja tidak diisi — admin adalah pemilik toko, bukan petugas outlet
        },
      });

      return { tenant, admin };
    });

    return NextResponse.json({
      message: `Toko "${result.tenant.nama}" berhasil dibuat`,
      tenant:  result.tenant,
      admin:   { id: result.admin.id, email: result.admin.email },
    });
  } catch (error) {
    console.error('[POST /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal membuat toko' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id, plan, maxOutlets, maxUsers, nama, email, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'Tenant ID diperlukan' }, { status: 400 });

    const tenant = await prisma.tenant.update({
      where: { id },
      data: {
        ...(plan       !== undefined && { plan }),
        ...(maxOutlets !== undefined && { maxOutlets: Number(maxOutlets) }),
        ...(maxUsers   !== undefined && { maxUsers:   Number(maxUsers)   }),
        ...(nama       !== undefined && { nama }),
        ...(email      !== undefined && { email }),
        ...(isActive   !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error('[PATCH /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal update toko' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Tenant ID diperlukan' }, { status: 400 });

    await prisma.tenant.delete({ where: { id } });
    return NextResponse.json({ message: 'Toko berhasil dihapus' });
  } catch (error) {
    console.error('[DELETE /api/tenants]', error);
    return NextResponse.json({ error: 'Gagal menghapus toko' }, { status: 500 });
  }
}