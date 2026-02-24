// app/api/outlets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  try {
    const outlets = await prisma.outlet.findMany({
      include: { _count: { select: { users: true, products: true, tables: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ outlets });
  } catch (error: any) {
    console.error('GET /api/outlets error:', error);
    return NextResponse.json({ message: 'Gagal memuat outlets', details: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  try {
    const { nama, alamat, telepon, tenantId: bodyTenantId } = await req.json();

    if (!nama) {
      return NextResponse.json({ message: 'Nama outlet harus diisi' }, { status: 400 });
    }

    // Tentukan tenantId yang dipakai
    let resolvedTenantId = bodyTenantId ?? tenantId;

    // Jika SUPERADMIN tidak punya tenantId, cari atau buat default tenant
    if (!resolvedTenantId && role === 'SUPERADMIN') {
      let defaultTenant = await prisma.tenant.findUnique({
        where: { slug: 'default' },
      });

      if (!defaultTenant) {
        defaultTenant = await prisma.tenant.create({
          data: {
            nama: 'Default Tenant',
            slug: 'default',
            plan: 'PRO',
            maxOutlets: 99,
            maxUsers: 999,
            isActive: true,
          },
        });
        console.log('Created default tenant:', defaultTenant.id);
      }

      resolvedTenantId = defaultTenant.id;
    }

    if (!resolvedTenantId) {
      return NextResponse.json({ message: 'Tenant ID diperlukan' }, { status: 400 });
    }

    const outlet = await prisma.outlet.create({
      data: {
        nama,
        alamat:   alamat   || null,
        telepon:  telepon  || null,
        tenantId: resolvedTenantId,
      },
    });

    return NextResponse.json({ outlet });
  } catch (error: any) {
    console.error('POST /api/outlets error:', error);
    return NextResponse.json({ message: 'Gagal membuat outlet', details: error.message }, { status: 500 });
  }
}