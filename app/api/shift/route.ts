// app/api/shift/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/shift?outletId=xxx — ambil shift aktif
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get('outletId');
    const history  = searchParams.get('history') === 'true';

    if (!outletId) return NextResponse.json({ error: 'outletId required' }, { status: 400 });

    if (history) {
      const shifts = await prisma.shift.findMany({
        where: { outletId },
        orderBy: { openedAt: 'desc' },
        take: 20,
      });
      return NextResponse.json({ shifts });
    }

    const activeShift = await prisma.shift.findFirst({
      where: { outletId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });

    return NextResponse.json({ shift: activeShift });
  } catch (error) {
    console.error('[GET /api/shift]', error);
    return NextResponse.json({ error: 'Gagal mengambil shift' }, { status: 500 });
  }
}

// POST /api/shift — buka shift baru
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outletId, kasirId, kasirNama, openingBalance } = body;

    // Cek apakah sudah ada shift aktif
    const existing = await prisma.shift.findFirst({
      where: { outletId, status: 'OPEN' },
    });
    if (existing) {
      return NextResponse.json({ error: 'Masih ada shift aktif yang belum ditutup' }, { status: 400 });
    }

    const shift = await prisma.shift.create({
      data: { outletId, kasirId, kasirNama, openingBalance: openingBalance ?? 0 },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    console.error('[POST /api/shift]', error);
    return NextResponse.json({ error: 'Gagal membuka shift' }, { status: 500 });
  }
}

// PATCH /api/shift — tutup shift
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { shiftId, closingBalance, notes } = body;

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return NextResponse.json({ error: 'Shift tidak ditemukan' }, { status: 404 });
    if (shift.status === 'CLOSED') return NextResponse.json({ error: 'Shift sudah ditutup' }, { status: 400 });

    // Hitung total penjualan selama shift ini dari sistem
    const [txSum, orderSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          outletId: shift.outletId,
          status: 'BERHASIL',
          createdAt: { gte: shift.openedAt },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          table: { outletId: shift.outletId },
          createdAt: { gte: shift.openedAt },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const salesTotal  = (txSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0);
    const systemBalance = shift.openingBalance + salesTotal;
    const difference    = closingBalance - systemBalance;

    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        closedAt: new Date(),
        closingBalance,
        systemBalance,
        difference,
        notes,
        status: 'CLOSED',
      },
    });

    return NextResponse.json({ shift: updated, salesTotal });
  } catch (error) {
    console.error('[PATCH /api/shift]', error);
    return NextResponse.json({ error: 'Gagal menutup shift' }, { status: 500 });
  }
}