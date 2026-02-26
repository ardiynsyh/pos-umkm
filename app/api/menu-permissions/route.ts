// PATH: app/api/menu-permissions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALL_MENUS = [
  { key: 'kasir',            label: 'Kasir' },
  { key: 'produk',           label: 'Produk' },
  { key: 'laporan',          label: 'Laporan' },
  { key: 'pesanan',          label: 'Pesanan' },
  { key: 'pengeluaran',      label: 'Pengeluaran' },
  { key: 'supplier',         label: 'Supplier' },
  { key: 'target-penjualan', label: 'Target Penjualan' },
  { key: 'users',            label: 'Users' },
  { key: 'settings',         label: 'Settings' },
  { key: 'absensi',          label: 'Absensi' },
  { key: 'jadwal',           label: 'Jadwal' },
  { key: 'log-aktivitas',    label: 'Log Aktivitas' },
  { key: 'payroll',          label: 'Payroll' },
];

const CONFIGURABLE_ROLES = ['ADMIN', 'MANAGER', 'KASIR'];

// ── GET /api/menu-permissions ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const headerRole     = req.headers.get('x-user-role');
  const headerTenantId = req.headers.get('x-tenant-id');

  // ✅ SUPERADMIN boleh kirim outletId via query param untuk filter per outlet
  const { searchParams } = new URL(req.url);
  const queryOutletId = searchParams.get('outletId');

  // Tentukan tenantId yang dipakai untuk query
  // Priority: query param (dari UI) > header (dari cookie middleware)
  const tenantId = queryOutletId ?? headerTenantId;

  // Auth check: non-SUPERADMIN harus punya tenantId
  if (headerRole !== 'SUPERADMIN' && !tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ✅ Kalau ada tenantId (dipilih dari UI atau dari header), filter per tenant
    // Kalau SUPERADMIN tanpa filter → ambil semua (fallback)
    const whereClause = tenantId ? { tenantId } : {};

    const permissions = await prisma.menuPermission.findMany({
      where: whereClause,
    });

    // Build hasil: default semua menu = true jika belum ada record
    const result: Record<string, Record<string, boolean>> = {};
    for (const r of CONFIGURABLE_ROLES) {
      result[r] = {};
      for (const menu of ALL_MENUS) {
        const perm = permissions.find(p => p.role === r && p.menuKey === menu.key);
        result[r][menu.key] = perm ? perm.isEnabled : true;
      }
    }

    return NextResponse.json({ permissions: result });
  } catch (error) {
    console.error('[GET /api/menu-permissions]', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

// ── PUT /api/menu-permissions ─────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const headerRole     = req.headers.get('x-user-role');
  const headerTenantId = req.headers.get('x-tenant-id');

  if (headerRole !== 'SUPERADMIN' && !headerTenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { role: targetRole, menuKey, isEnabled, outletId: bodyOutletId } = body;

    // Validasi field wajib
    if (!targetRole || !menuKey || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Data tidak valid: role, menuKey, isEnabled wajib diisi' }, { status: 400 });
    }

    if (!CONFIGURABLE_ROLES.includes(targetRole)) {
      return NextResponse.json({ error: 'Role tidak bisa dikonfigurasi' }, { status: 400 });
    }

    // ✅ Prioritas tenantId: body (dari UI) > header (dari cookie) > cari outlet pertama
    let targetTenantId: string | null =
      bodyOutletId ?? headerTenantId ?? null;

    // SUPERADMIN tanpa outletId → fallback ke outlet pertama
    if (!targetTenantId && headerRole === 'SUPERADMIN') {
      const firstOutlet = await prisma.outlet.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!firstOutlet) {
        return NextResponse.json({ error: 'Tidak ada outlet ditemukan' }, { status: 400 });
      }
      targetTenantId = firstOutlet.id;
    }

    if (!targetTenantId) {
      return NextResponse.json({ error: 'Outlet ID diperlukan' }, { status: 400 });
    }

    // Verifikasi outlet ada
    const outlet = await prisma.outlet.findUnique({ where: { id: targetTenantId } });
    if (!outlet) {
      return NextResponse.json({ error: `Outlet "${targetTenantId}" tidak ditemukan` }, { status: 400 });
    }

    // Upsert permission
    const permission = await prisma.menuPermission.upsert({
      where: {
        menuKey_role_tenantId: { menuKey, role: targetRole, tenantId: targetTenantId },
      },
      update: { isEnabled },
      create:  { menuKey, role: targetRole, isEnabled, tenantId: targetTenantId },
    });

    return NextResponse.json({ success: true, permission });
  } catch (error) {
    console.error('[PUT /api/menu-permissions]', error);
    return NextResponse.json({
      error:   'Gagal menyimpan data',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
