// app/api/shift/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get('outletId') || null;
    const history  = searchParams.get('history') === 'true';

    // outletId wajib untuk operasional shift
    if (!outletId) {
      return NextResponse.json({ error: 'outletId required' }, { status: 400 });
    }

    const tenantFilter = tenantId ? { tenantId } : {};

    if (history) {
      const shifts = await prisma.shift.findMany({
        where: { outletId, ...tenantFilter },
        orderBy: { openedAt: 'desc' },
        take: 20,
      });
      return NextResponse.json({ shifts });
    }

    const activeShift = await prisma.shift.findFirst({
      where: { outletId, status: 'OPEN', ...tenantFilter },
      orderBy: { openedAt: 'desc' },
    });
    return NextResponse.json({ shift: activeShift });
  } catch (error) {
    console.error('[GET /api/shift]', error);
    return NextResponse.json({ error: 'Gagal mengambil shift' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { outletId, kasirId, kasirNama, openingBalance } = await req.json();

    if (!outletId) {
      return NextResponse.json({ error: 'outletId required' }, { status: 400 });
    }

    const tenantFilter = tenantId ? { tenantId } : {};

    const existing = await prisma.shift.findFirst({
      where: { outletId, status: 'OPEN', ...tenantFilter },
    });
    if (existing) {
      return NextResponse.json({ error: 'Masih ada shift aktif yang belum ditutup' }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: {
        outletId, kasirId, kasirNama,
        openingBalance: openingBalance ?? 0,
        ...(tenantId && { tenantId }),
      },
    });
    return NextResponse.json({ shift });
  } catch (error) {
    console.error('[POST /api/shift]', error);
    return NextResponse.json({ error: 'Gagal membuka shift' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { shiftId, closingBalance, notes } = await req.json();

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    }
    // Validasi tenant hanya jika bukan SUPERADMIN
    if (tenantId && shift.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (shift.status === 'CLOSED') {
      return NextResponse.json({ error: 'Shift sudah ditutup' }, { status: 400 });
    }

    const tenantFilter    = tenantId ? { tenantId } : {};
    const outletTenantFilter = tenantId ? { outlet: { tenantId } } : {};

    const [txSum, orderSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...tenantFilter, outletId: shift.outletId, status: 'BERHASIL', createdAt: { gte: shift.openedAt } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED', table: { outletId: shift.outletId, ...outletTenantFilter }, createdAt: { gte: shift.openedAt } },
        _sum: { totalAmount: true },
      }),
    ]);

    const salesTotal    = (txSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0);
    const systemBalance = shift.openingBalance + salesTotal;
    const difference    = closingBalance - systemBalance;

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedAt: new Date(), closingBalance,
        systemBalance, difference, notes, status: 'CLOSED',
      },
    });

    return NextResponse.json({ shift: updated, salesTotal });
  } catch (error) {
    console.error('[PATCH /api/shift]', error);
    return NextResponse.json({ error: 'Gagal menutup shift' }, { status: 500 });
  }
}