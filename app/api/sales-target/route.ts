// app/api/sales-target/route.ts
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
    const year     = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()));
    const month    = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1));

    // SUPERADMIN tanpa outletId → kembalikan default (tidak ada target spesifik)
    // tapi tetap hitung actual dari semua outlet
    const outletFilter = outletId ? { outletId } : {};
    const tenantFilter = tenantId ? { tenantId } : {};
    const tableFilter  = outletId
      ? { table: { outletId, ...(tenantId && { outlet: { tenantId } }) } }
      : tenantId
        ? { table: { outlet: { tenantId } } }
        : {};

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

    // Hanya cari target jika ada outletId
    const targets = outletId
      ? await prisma.salesTarget.findMany({
          where: { outletId, year, month, ...(tenantId && { tenantId }) },
        })
      : [];

    const [transactionSum, orderSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED', ...tableFilter, createdAt: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { totalAmount: true },
      }),
    ]);

    const actualMonthly = (transactionSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0);

    const today      = new Date();
    const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endToday   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const [txToday, orderToday] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: startToday, lte: endToday } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { status: 'COMPLETED', ...tableFilter, createdAt: { gte: startToday, lte: endToday } },
        _sum: { totalAmount: true },
      }),
    ]);

    const actualDaily   = (txToday._sum.total ?? 0) + (orderToday._sum.totalAmount ?? 0);
    const monthlyTarget = targets.find(t => t.type === 'MONTHLY');
    const dailyTarget   = targets.find(t => t.type === 'DAILY' && t.day === today.getDate());

    return NextResponse.json({
      monthly: { target: monthlyTarget?.amount ?? 0, actual: actualMonthly },
      daily:   { target: dailyTarget?.amount   ?? 0, actual: actualDaily },
    });
  } catch (error) {
    console.error('[GET /api/sales-target]', error);
    return NextResponse.json({ error: 'Gagal mengambil target' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { outletId, type, amount, year, month, day } = await req.json();
    const target = await prisma.salesTarget.upsert({
      where: { outletId_type_year_month_day: { outletId, type, year, month, day: day ?? null } },
      update: { amount },
      create: { outletId, type, amount, year, month, day: day ?? null, tenantId },
    });
    return NextResponse.json({ target });
  } catch (error) {
    console.error('[POST /api/sales-target]', error);
    return NextResponse.json({ error: 'Gagal menyimpan target' }, { status: 500 });
  }
}