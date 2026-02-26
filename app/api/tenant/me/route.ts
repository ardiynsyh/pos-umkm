// app/api/outlets/me/route.ts
// Ambil outlet milik user yang sedang login (fallback jika outletId tidak ada di store)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const userId   = req.headers.get('x-user-id');

  if (!tenantId && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Coba ambil outlet dari user langsung
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { outlet: { select: { id: true, nama: true, alamat: true } } },
      });

      if (user?.outlet) {
        return NextResponse.json({ outlet: user.outlet });
      }
    }

    // Fallback: ambil outlet pertama dari tenant
    if (tenantId) {
      const outlets = await prisma.outlet.findMany({
        where: { tenantId },
        select: { id: true, nama: true, alamat: true },
        orderBy: { createdAt: 'asc' },
        take: 5,
      });

      if (outlets.length > 0) {
        return NextResponse.json({ outlet: outlets[0], outlets });
      }
    }

    return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 404 });
  } catch (error) {
    console.error('[GET /api/outlets/me]', error);
    return NextResponse.json({ error: 'Gagal mengambil data outlet' }, { status: 500 });
  }
}
