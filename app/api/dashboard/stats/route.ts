// app/api/dashboard/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const where = tenantId ? { tenantId } : {};

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaySales = await prisma.transaction.aggregate({
      where: { ...where, createdAt: { gte: today, lt: tomorrow }, status: 'BERHASIL' },
      _sum: { totalBayar: true },
      _count: true,
    });

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlySales = await prisma.transaction.aggregate({
      where: { ...where, createdAt: { gte: firstDayOfMonth }, status: 'BERHASIL' },
      _sum: { totalBayar: true },
      _count: true,
    });

    const topProducts = await prisma.transactionItem.groupBy({
      by: ['productId', 'namaProduk'],
      where: tenantId ? { transaction: { tenantId } } : {},
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    });

    const lowStock = await prisma.product.findMany({
      where: {
        ...where,
        stok: { lte: prisma.product.fields.stokMinimal },
      },
      select: { id: true, nama: true, sku: true, stok: true, stokMinimal: true },
      take: 10,
    });

    const totalProducts = await prisma.product.count({ where });

    return NextResponse.json({
      todaySales: { total: todaySales._sum.totalBayar || 0, count: todaySales._count },
      monthlySales: { total: monthlySales._sum.totalBayar || 0, count: monthlySales._count },
      topProducts,
      lowStock,
      totalProducts,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}