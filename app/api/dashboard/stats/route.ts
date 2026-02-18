import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Total penjualan hari ini
    const todaySales = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
        status: 'BERHASIL',
      },
      _sum: {
        totalBayar: true,
      },
      _count: true,
    });

    // Total penjualan bulan ini
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlySales = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: firstDayOfMonth,
        },
        status: 'BERHASIL',
      },
      _sum: {
        totalBayar: true,
      },
      _count: true,
    });

    // Produk terlaris
    const topProducts = await prisma.transactionItem.groupBy({
      by: ['productId', 'namaProduk'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    // Stok menipis
    const lowStock = await prisma.product.findMany({
      where: {
        stok: {
          lte: prisma.product.fields.stokMinimal,
        },
      },
      select: {
        id: true,
        nama: true,
        sku: true,
        stok: true,
        stokMinimal: true,
      },
      take: 10,
    });

    // Total produk
    const totalProducts = await prisma.product.count();

    return NextResponse.json({
      todaySales: {
        total: todaySales._sum.totalBayar || 0,
        count: todaySales._count,
      },
      monthlySales: {
        total: monthlySales._sum.totalBayar || 0,
        count: monthlySales._count,
      },
      topProducts,
      lowStock,
      totalProducts,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}