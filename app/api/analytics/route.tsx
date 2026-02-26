// app/api/analytics/route.ts
// ✅ Terintegrasi: Transaksi kasir + Order self-service + Pengeluaran
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
    const outletId  = searchParams.get('outletId') || null;

    const tenantFilter = tenantId ? { tenantId } : {};
    const outletFilter = outletId ? { outletId } : {};
    const tableOutletFilter = outletId
      ? { table: { outletId, ...(tenantId && { outlet: { tenantId } }) } }
      : tenantId ? { table: { outlet: { tenantId } } } : {};

    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today.getTime() + 86400000 - 1);

    // ── 7 hari terakhir ───────────────────────────────────────────────────────
    const daily7: { date: string; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(today);
      d.setDate(d.getDate() - i);
      const end = new Date(d.getTime() + 86400000 - 1);

      const [txSum, orderSum] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: d, lte: end } },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: d, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);

      daily7.push({
        date:  d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
        total: (txSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0),
      });
    }

    // ── 6 bulan terakhir ──────────────────────────────────────────────────────
    const monthly6: { month: string; total: number; pengeluaran: number; profit: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m   = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [txSum, orderSum, pengeluaranSum] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: m, lte: end } },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: m, lte: end } },
          _sum: { totalAmount: true },
        }),
        prisma.pengeluaran.aggregate({
          where: { ...tenantFilter, tanggal: { gte: m, lte: end } },
          _sum: { jumlah: true },
        }),
      ]);

      const pendapatan   = (txSum._sum.total ?? 0) + (orderSum._sum.totalAmount ?? 0);
      const pengeluaran  = pengeluaranSum._sum.jumlah ?? 0;

      monthly6.push({
        month:       m.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        total:       pendapatan,
        pengeluaran: pengeluaran,
        profit:      pendapatan - pengeluaran,
      });
    }

    // ── Data hari ini ─────────────────────────────────────────────────────────
    const [txToday, orderToday, pengeluaranToday] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: today, lte: todayEnd } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.aggregate({
        where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: today, lte: todayEnd } },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.pengeluaran.aggregate({
        where: { ...tenantFilter, tanggal: { gte: today, lte: todayEnd } },
        _sum: { jumlah: true },
      }),
    ]);

    const todayRevenue     = (txToday._sum.total ?? 0) + (orderToday._sum.totalAmount ?? 0);
    const todayPengeluaran = pengeluaranToday._sum.jumlah ?? 0;
    const todayProfit      = todayRevenue - todayPengeluaran;

    // ── Bulan ini vs bulan lalu ───────────────────────────────────────────────
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisMonthTx, thisMonthOrder, lastMonthTx, lastMonthOrder] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: thisMonthStart } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: thisMonthStart } }, _sum: { totalAmount: true } }),
      prisma.transaction.aggregate({ where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: lastMonthStart, lte: lastMonthEnd } }, _sum: { totalAmount: true } }),
    ]);

    const thisMonth = (thisMonthTx._sum.total ?? 0) + (thisMonthOrder._sum.totalAmount ?? 0);
    const lastMonth = (lastMonthTx._sum.total ?? 0) + (lastMonthOrder._sum.totalAmount ?? 0);
    const growth    = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

    // ── Top produk ─────────────────────────────────────────────────────────────
    const topProductsRaw = await prisma.transactionItem.groupBy({
      by: ['productId', 'namaProduk'],
      where: {
        transaction: {
          status: 'BERHASIL',
          createdAt: { gte: thisMonthStart },
          ...tenantFilter,
          ...outletFilter,
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const topProducts = topProductsRaw.map(p => ({
      name:    p.namaProduk,
      qty:     p._sum.quantity ?? 0,
      revenue: p._sum.subtotal ?? 0,
    }));

    // ── Per jam hari ini ──────────────────────────────────────────────────────
    const hourlyData: { jam: string; total: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const start = new Date(today.getTime() + h * 3600000);
      const end   = new Date(start.getTime() + 3600000 - 1);
      const [txH, orderH] = await Promise.all([
        prisma.transaction.aggregate({
          where: { ...tenantFilter, ...outletFilter, status: 'BERHASIL', createdAt: { gte: start, lte: end } },
          _sum: { total: true },
        }),
        prisma.order.aggregate({
          where: { ...tableOutletFilter, status: 'COMPLETED', createdAt: { gte: start, lte: end } },
          _sum: { totalAmount: true },
        }),
      ]);
      hourlyData.push({
        jam:   `${String(h).padStart(2,'0')}:00`,
        total: (txH._sum.total ?? 0) + (orderH._sum.totalAmount ?? 0),
      });
    }

    // ── Stok rendah ───────────────────────────────────────────────────────────
    const lowStock = await prisma.product.findMany({
      where: {
        ...tenantFilter,
        ...outletFilter,
        stok: { lte: prisma.product.fields.stokMinimal },
      },
      select: { id: true, nama: true, stok: true, stokMinimal: true, satuan: true },
      take: 5,
      orderBy: { stok: 'asc' },
    });

    return NextResponse.json({
      daily7,
      monthly6,
      hourlyData,
      topProducts,
      today: {
        total:       todayRevenue,
        count:       txToday._count + orderToday._count,
        pengeluaran: todayPengeluaran,
        profit:      todayProfit,
      },
      comparison: { thisMonth, lastMonth, growth },
      lowStock,
    });
  } catch (error) {
    console.error('[GET /api/analytics]', error);
    return NextResponse.json({ error: 'Gagal mengambil analytics' }, { status: 500 });
  }
}