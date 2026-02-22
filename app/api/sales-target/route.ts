// app/api/sales-target/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/sales-target?outletId=xxx&year=2026&month=2
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get('outletId');
    const year     = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()));
    const month    = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

    if (!outletId) return NextResponse.json({ error: 'outletId required' }, { status: 400 });

    const targets = await prisma.salesTarget.findMany({
      where: { outletId, year, month },
    });

    // Hitung actual penjualan bulan ini
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

    const [transactionSum, orderSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: { outletId, status: 'BERHASIL', createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: {
          status: 'COMPLETED',
          table: { outletId },
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const actualMonthly = (transactionSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0);

    // Hitung actual hari ini
    const today      = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endToday   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [txToday, orderToday] = await Promise.all([
      prisma.transaction.aggregate({
        where: { outletId, status: 'BERHASIL', createdAt: { gte: startToday, lte: endToday } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED', table: { outletId }, createdAt: { gte: startToday, lte: endToday } },
        _sum: { totalAmount: true },
      }),
    ]);

    const actualDaily = (txToday._sum.total ?? 0) + (orderToday._sum.totalAmount ?? 0);

    const monthlyTarget = targets.find(t => t.type === 'MONTHLY');
    const dailyTarget   = targets.find(t => t.type === 'DAILY' && t.day === today.getDate());

    return NextResponse.json({
      monthly: { target: monthlyTarget?.amount ?? 0, actual: actualMonthly },
      daily:   { target: dailyTarget?.amount ?? 0,   actual: actualDaily },
    });
  } catch (error) {
    console.error('[GET /api/sales-target]', error);
    return NextResponse.json({ error: 'Gagal mengambil target' }, { status: 500 });
  }
}

// POST /api/sales-target — set target
export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const { outletId, type, amount, year, month, day } = body;

    const target = await prisma.salesTarget.upsert({
      where: { outletId_type_year_month_day: { outletId, type, year, month, day: day ?? null } },
      update: { amount },
      create: { outletId, type, amount, year, month, day: day ?? null },
    });

    return NextResponse.json({ target });
  } catch (error) {
    console.error('[POST /api/sales-target]', error);
    return NextResponse.json({ error: 'Gagal menyimpan target' }, { status: 500 });
  }
}