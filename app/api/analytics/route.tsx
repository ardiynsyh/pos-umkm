// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const outletId = searchParams.get('outletId') || null;
    const now      = new Date();
    const year     = now.getFullYear();
    const month    = now.getMonth();

    // Jika outletId ada → filter per outlet, jika tidak (SUPERADMIN) → semua outlet
    const outletFilter = outletId ? { outletId } : {};
    const tableFilter  = outletId ? { table: { outletId } } : {};

    // ── 1. Penjualan 7 hari terakhir ───────────────────────────────────────
    const daily7: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d     = new Date(now); d.setDate(now.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end   = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      const [tx, ord] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...tableFilter, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);
      daily7.push({
        date: start.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }),
        total: (tx._sum.total ?? 0) + (ord._sum.totalAmount ?? 0),
      });
    }

    // ── 2. Penjualan 6 bulan terakhir ─────────────────────────────────────
    const monthly6: { month: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(year, month - i, 1);
      const yr = d.getFullYear(), mo = d.getMonth();
      const start = new Date(yr, mo, 1);
      const end   = new Date(yr, mo + 1, 0, 23, 59, 59);
      const [tx, ord] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...tableFilter, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);
      monthly6.push({
        month: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        total: (tx._sum.total ?? 0) + (ord._sum.totalAmount ?? 0),
      });
    }

    // ── 3. Produk terlaris ─────────────────────────────────────────────────
    const startMonth = new Date(year, month, 1);
    const endMonth   = new Date(year, month + 1, 0, 23, 59, 59);

    const topProducts = await prisma.transactionItem.groupBy({
      by: ['namaProduk'],
      where: {
        transaction: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: startMonth, lte: endMonth } },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    // ── 4. Penjualan per jam (hari ini) ────────────────────────────────────
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const txToday = await prisma.transaction.findMany({
      where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: startToday, lte: endToday } },
      select: { createdAt: true, total: true },
    });

    const hourly: Record<number, number> = {};
    for (let h = 7; h <= 22; h++) hourly[h] = 0;
    txToday.forEach(t => {
      const h = new Date(t.createdAt).getHours();
      if (h >= 7 && h <= 22) hourly[h] = (hourly[h] ?? 0) + t.total;
    });
    const hourlyData = Object.entries(hourly).map(([h, total]) => ({
      jam: `${h}:00`, total,
    }));

    // ── 5. Perbandingan bulan ini vs bulan lalu ────────────────────────────
    const startLastMonth = new Date(year, month - 1, 1);
    const endLastMonth   = new Date(year, month, 0, 23, 59, 59);

    const [txThis, ordThis, txLast, ordLast] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: startMonth, lte: endMonth } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { ...tableFilter, status: 'COMPLETED', createdAt: { gte: startMonth, lte: endMonth } },
        _sum: { totalAmount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: startLastMonth, lte: endLastMonth } },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { ...tableFilter, status: 'COMPLETED', createdAt: { gte: startLastMonth, lte: endLastMonth } },
        _sum: { totalAmount: true },
      }),
    ]);

    const thisMonth = (txThis._sum.total ?? 0) + (ordThis._sum.totalAmount ?? 0);
    const lastMonth = (txLast._sum.total ?? 0) + (ordLast._sum.totalAmount ?? 0);
    const growth    = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // ── 6. Total transaksi hari ini ────────────────────────────────────────
    const [txTodayCount, ordTodayCount] = await Promise.all([
      prisma.transaction.count({
        where: { ...outletFilter, status: 'BERHASIL', createdAt: { gte: startToday, lte: endToday } },
      }),
      prisma.order.count({
        where: { ...tableFilter, status: 'COMPLETED', createdAt: { gte: startToday, lte: endToday } },
      }),
    ]);

    const todayTotal = txToday.reduce((s, t) => s + t.total, 0);

    return NextResponse.json({
      daily7,
      monthly6,
      hourlyData,
      topProducts: topProducts.map(p => ({
        name:    p.namaProduk,
        qty:     p._sum.quantity ?? 0,
        revenue: p._sum.subtotal ?? 0,
      })),
      comparison: { thisMonth, lastMonth, growth: Math.round(growth * 10) / 10 },
      today:      { total: todayTotal, count: txTodayCount + ordTodayCount },
    });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json({ error: 'Gagal mengambil analytics' }, { status: 500 });
  }
}