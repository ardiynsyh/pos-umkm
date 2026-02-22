// app/api/menu-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_MENUS, CONFIGURABLE_ROLES } from '@/lib/menu-permissions';

// GET /api/menu-permissions
export async function GET() {
  try {
    const permissions = await prisma.menuPermission.findMany();

    const result: Record<string, Record<string, boolean>> = {};

    for (const role of CONFIGURABLE_ROLES) {
      result[role] = {};
      for (const menu of ALL_MENUS) {
        const perm = permissions.find(
          (p) => p.role === role && p.menuKey === menu.key
        );
        result[role][menu.key] = perm ? perm.isEnabled : true;
      }
    }

    return NextResponse.json({ permissions: result });
  } catch (error) {
    console.error('[GET /api/menu-permissions]', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// PUT /api/menu-permissions
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, menuKey, isEnabled } = body;

    if (!role || !menuKey || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 });
    }

    if (!CONFIGURABLE_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Role tidak bisa dikonfigurasi' }, { status: 400 });
    }

    const permission = await prisma.menuPermission.upsert({
      where: { menuKey_role: { menuKey, role } },
      update: { isEnabled },
      create: { menuKey, role, isEnabled },
    });

    return NextResponse.json({ permission });
  } catch (error) {
    console.error('[PUT /api/menu-permissions]', error);
    return NextResponse.json({ error: 'Gagal menyimpan data' }, { status: 500 });
  }
}