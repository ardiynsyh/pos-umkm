// app/api/admin/menu-permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ALL_MENUS, CONFIGURABLE_ROLES } from '@/lib/menu-permissions';

// GET: Ambil semua permissions (bisa filter by tenantId)
export async function GET(req: NextRequest) {
  // ONLY SUPERADMIN
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden - Hanya SUPERADMIN' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    const whereClause = tenantId ? { tenantId } : {};
    
    const permissions = await prisma.menuPermission.findMany({
      where: whereClause,
      orderBy: [
        { tenantId: 'asc' },
        { role: 'asc' },
        { menuKey: 'asc' }
      ]
    });

    // Ambil semua outlets
    const outlets = await prisma.outlet.findMany({
      include: {
        tenant: {
          select: {
            nama: true
          }
        }
      }
    });
    
    // Group by tenant/outlet
    const groupedByOutlet: Record<string, any> = {};
    
    // Initialize untuk setiap outlet
    outlets.forEach(outlet => {
      groupedByOutlet[outlet.id] = {
        outletId: outlet.id,
        outletName: outlet.nama,
        tenantId: outlet.tenantId,
        tenantName: outlet.tenant?.nama || 'Unknown',
        permissions: {}
      };
      
      // Initialize all roles with default true
      CONFIGURABLE_ROLES.forEach(r => {
        groupedByOutlet[outlet.id].permissions[r] = {};
        ALL_MENUS.forEach(menu => {
          groupedByOutlet[outlet.id].permissions[r][menu.key] = true;
        });
      });
    });
    
    // Override dengan actual permission
    permissions.forEach(perm => {
      if (groupedByOutlet[perm.tenantId]) {
        groupedByOutlet[perm.tenantId].permissions[perm.role][perm.menuKey] = perm.isEnabled;
      }
    });

    return NextResponse.json({ 
      success: true,
      data: Object.values(groupedByOutlet)
    });
  } catch (error) {
    console.error('[ADMIN GET /api/admin/menu-permissions]', error);
    return NextResponse.json({ 
      error: 'Gagal mengambil data permissions' 
    }, { status: 500 });
  }
}

// POST: Create/Update single permission
export async function POST(req: NextRequest) {
  // ONLY SUPERADMIN
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden - Hanya SUPERADMIN' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tenantId, role: targetRole, menuKey, isEnabled } = body;

    // Validasi
    if (!tenantId || !targetRole || !menuKey || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ 
        error: 'Data tidak lengkap. Required: tenantId, role, menuKey, isEnabled' 
      }, { status: 400 });
    }

    if (!CONFIGURABLE_ROLES.includes(targetRole)) {
      return NextResponse.json({ 
        error: `Role ${targetRole} tidak bisa dikonfigurasi` 
      }, { status: 400 });
    }

    if (!ALL_MENUS.find(m => m.key === menuKey)) {
      return NextResponse.json({ 
        error: `Menu ${menuKey} tidak valid` 
      }, { status: 400 });
    }

    // Cek apakah outlet dengan ID tersebut ada
    const outlet = await prisma.outlet.findUnique({
      where: { id: tenantId }
    });

    if (!outlet) {
      return NextResponse.json({ 
        error: `Outlet dengan ID ${tenantId} tidak ditemukan` 
      }, { status: 400 });
    }

    // Upsert permission
    const permission = await prisma.menuPermission.upsert({
      where: {
        menuKey_role_tenantId: {
          menuKey,
          role: targetRole,
          tenantId
        }
      },
      update: { isEnabled },
      create: {
        menuKey,
        role: targetRole,
        isEnabled,
        tenantId
      }
    });

    return NextResponse.json({ 
      success: true,
      data: permission 
    });
  } catch (error) {
    console.error('[ADMIN POST /api/admin/menu-permissions]', error);
    return NextResponse.json({ 
      error: 'Gagal menyimpan permission',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Batch update untuk satu tenant
export async function PUT(req: NextRequest) {
  // ONLY SUPERADMIN
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden - Hanya SUPERADMIN' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { tenantId, permissions } = body;

    if (!tenantId || !Array.isArray(permissions)) {
      return NextResponse.json({ 
        error: 'Data tidak valid' 
      }, { status: 400 });
    }

    // Cek apakah outlet dengan ID tersebut ada
    const outlet = await prisma.outlet.findUnique({
      where: { id: tenantId }
    });

    if (!outlet) {
      return NextResponse.json({ 
        error: `Outlet dengan ID ${tenantId} tidak ditemukan` 
      }, { status: 400 });
    }

    // Batch update menggunakan transaction
    const result = await prisma.$transaction(
      permissions.map(p => 
        prisma.menuPermission.upsert({
          where: {
            menuKey_role_tenantId: {
              menuKey: p.menuKey,
              role: p.role,
              tenantId
            }
          },
          update: { isEnabled: p.isEnabled },
          create: {
            menuKey: p.menuKey,
            role: p.role,
            isEnabled: p.isEnabled,
            tenantId
          }
        })
      )
    );

    return NextResponse.json({ 
      success: true,
      data: result,
      message: `${result.length} permissions berhasil diupdate`
    });
  } catch (error) {
    console.error('[ADMIN PUT /api/admin/menu-permissions]', error);
    return NextResponse.json({ 
      error: 'Gagal batch update permissions' 
    }, { status: 500 });
  }
}

// DELETE: Reset permissions tenant ke default
export async function DELETE(req: NextRequest) {
  // ONLY SUPERADMIN
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden - Hanya SUPERADMIN' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ 
        error: 'tenantId required' 
      }, { status: 400 });
    }

    // Delete all permissions for this tenant
    await prisma.menuPermission.deleteMany({
      where: { tenantId }
    });

    return NextResponse.json({ 
      success: true,
      message: `Permissions untuk tenant ${tenantId} telah direset ke default`
    });
  } catch (error) {
    console.error('[ADMIN DELETE /api/admin/menu-permissions]', error);
    return NextResponse.json({ 
      error: 'Gagal reset permissions' 
    }, { status: 500 });
  }
}