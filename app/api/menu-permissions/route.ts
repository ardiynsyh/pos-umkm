// app/api/menu-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Daftar semua menu yang bisa dikontrol aksesnya
export const ALL_MENUS = [
  { key: 'kasir',    label: 'Kasir' },
  { key: 'produk',   label: 'Produk' },
  { key: 'laporan',  label: 'Laporan' },
  { key: 'pesanan',  label: 'Pesanan' },
  { key: 'users',    label: 'Users' },
  { key: 'settings', label: 'Settings' },
];

// Role yang bisa dikonfigurasi (SUPERADMIN selalu penuh, tidak perlu dikonfigurasi)
export const CONFIGURABLE_ROLES = ['ADMIN', 'MANAGER', 'KASIR'] as const;

// GET /api/menu-permissions
// Mengembalikan semua konfigurasi permission menu per role
export async function GET() {
  try {
    const permissions = await prisma.menuPermission.findMany();

    // Susun dalam format { role: { menuKey: boolean } }
    const result: Record<string, Record<string, boolean>> = {};

    for (const role of CONFIGURABLE_ROLES) {
      result[role] = {};
      for (const menu of ALL_MENUS) {
        // Cari apakah ada record di DB; kalau tidak ada, default = true (aktif)
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
// Body: { role: string, menuKey: string, isEnabled: boolean }
// Simpan atau update satu permission
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

    // Upsert: update jika sudah ada, insert jika belum
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