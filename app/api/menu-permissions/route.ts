// app/api/menu-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const ALL_MENUS = [
  { key: 'kasir', label: 'Kasir' },
  { key: 'produk', label: 'Produk' },
  { key: 'laporan', label: 'Laporan' },
  { key: 'pesanan', label: 'Pesanan' },
  { key: 'pengeluaran', label: 'Pengeluaran' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'pembelian', label: 'Pembelian' },
  { key: 'target-penjualan', label: 'Target Penjualan' },
  { key: 'users', label: 'Users' },
  { key: 'settings', label: 'Settings' },
  { key: 'absensi', label: 'Absensi' },
  { key: 'jadwal', label: 'Jadwal' },
  { key: 'log-aktivitas', label: 'Log Aktivitas' },
  { key: 'payroll', label: 'Payroll' },
];

const CONFIGURABLE_ROLES = ['ADMIN', 'MANAGER', 'KASIR'];

export async function GET(req: NextRequest) {
  console.log('[GET /api/menu-permissions] Headers:', {
    tenantId: req.headers.get('x-tenant-id'),
    role: req.headers.get('x-user-role')
  });

  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  
  if (role !== 'SUPERADMIN' && !tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const whereClause = role === 'SUPERADMIN' ? {} : { tenantId };
    
    const permissions = await prisma.menuPermission.findMany({
      where: whereClause,
    });

    console.log('[GET] Found permissions:', permissions.length);

    const result: Record<string, Record<string, boolean>> = {};
    for (const r of CONFIGURABLE_ROLES) {
      result[r] = {};
      for (const menu of ALL_MENUS) {
        const perm = permissions.find((p) => p.role === r && p.menuKey === menu.key);
        result[r][menu.key] = perm ? perm.isEnabled : true;
      }
    }

    return NextResponse.json({ permissions: result });
  } catch (error) {
    console.error('[GET /api/menu-permissions]', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  console.log('[PUT /api/menu-permissions] Start');
  
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  
  console.log('[PUT] Headers:', { tenantId, role });

  if (role !== 'SUPERADMIN' && !tenantId) {
    console.log('[PUT] Unauthorized - missing tenantId and not SUPERADMIN');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    console.log('[PUT] Request body:', body);

    const { role: targetRole, menuKey, isEnabled } = body;
    
    // Validasi data
    if (!targetRole || !menuKey || typeof isEnabled !== 'boolean') {
      console.log('[PUT] Invalid data:', { targetRole, menuKey, isEnabled });
      return NextResponse.json({ 
        error: 'Data tidak valid', 
        details: { targetRole, menuKey, isEnabled } 
      }, { status: 400 });
    }
    
    if (!CONFIGURABLE_ROLES.includes(targetRole)) {
      console.log('[PUT] Invalid role:', targetRole);
      return NextResponse.json({ 
        error: 'Role tidak bisa dikonfigurasi' 
      }, { status: 400 });
    }

    let targetTenantId = tenantId;
    
    // Jika SUPERADMIN dan tidak ada tenantId, gunakan outlet pertama
    if (role === 'SUPERADMIN' && !targetTenantId) {
      console.log('[PUT] SUPERADMIN without tenantId, finding first outlet');
      const firstOutlet = await prisma.outlet.findFirst();
      if (firstOutlet) {
        targetTenantId = firstOutlet.id;
        console.log('[PUT] Using first outlet:', targetTenantId);
      } else {
        console.log('[PUT] No outlets found');
        return NextResponse.json({ error: 'Tidak ada outlet ditemukan' }, { status: 400 });
      }
    }

    if (!targetTenantId) {
      console.log('[PUT] No tenantId provided');
      return NextResponse.json({ error: 'Tenant ID diperlukan' }, { status: 400 });
    }

    // Cek apakah outlet dengan ID tersebut ada
    console.log('[PUT] Checking outlet:', targetTenantId);
    const outlet = await prisma.outlet.findUnique({
      where: { id: targetTenantId }
    });

    if (!outlet) {
      console.log('[PUT] Outlet not found:', targetTenantId);
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 400 });
    }

    console.log('[PUT] Outlet found:', outlet.nama);

    // Upsert permission
    const permission = await prisma.menuPermission.upsert({
      where: {
        menuKey_role_tenantId: {
          menuKey,
          role: targetRole,
          tenantId: targetTenantId
        }
      },
      update: { isEnabled },
      create: {
        menuKey,
        role: targetRole,
        isEnabled,
        tenantId: targetTenantId
      },
    });

    console.log('[PUT] Permission saved:', permission);

    return NextResponse.json({ 
      success: true,
      permission 
    });
  } catch (error) {
    console.error('[PUT /api/menu-permissions] Error:', error);
    return NextResponse.json({ 
      error: 'Gagal menyimpan data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}