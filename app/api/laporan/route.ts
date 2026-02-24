// app/api/laporan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter      = searchParams.get('filter') || 'today';
    const customDay   = searchParams.get('day');
    const customMonth = searchParams.get('month');
    const customYear  = searchParams.get('year');

    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (filter === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7); startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'month') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 30); startDate.setHours(0, 0, 0, 0);
    } else if (filter === 'custom' && customMonth && customYear) {
      const yr = parseInt(customYear), mo = parseInt(customMonth) - 1;
      if (customDay) {
        const dy = parseInt(customDay);
        startDate = new Date(yr, mo, dy, 0, 0, 0);
        endDate   = new Date(yr, mo, dy, 23, 59, 59);
      } else {
        startDate = new Date(yr, mo, 1, 0, 0, 0);
        endDate   = new Date(yr, mo + 1, 0, 23, 59, 59);
      }
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate   && { lte: endDate }),
    };

    const tenantFilter = tenantId ? { tenantId } : {};

    const transactions = await prisma.transaction.findMany({
      where: { ...tenantFilter, status: 'BERHASIL', ...(startDate && { createdAt: dateFilter }) },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        ...(tenantId && { table: { outlet: { tenantId } } }),
        ...(startDate && { createdAt: dateFilter }),
      },
      include: { items: true, table: true },
      orderBy: { createdAt: 'desc' },
    });

    const mapPaymentMethod = (method: string) => {
      const map: Record<string, string> = {
        TUNAI: 'cash', DEBIT: 'card', KREDIT: 'card', QRIS: 'qris', TRANSFER: 'transfer',
        cash: 'cash', qris: 'qris', transfer: 'transfer', ewallet: 'ewallet', midtrans: 'card',
      };
      return map[method] || 'cash';
    };

    const normalizedTransactions = transactions.map((t) => ({
      id: t.id, transactionNumber: t.nomorTransaksi, source: 'kasir' as const,
      total: t.total, paymentMethod: mapPaymentMethod(t.metodePembayaran),
      cashierName: t.kasir || 'Kasir', customerName: t.pelanggan || '',
      tableInfo: '', paymentAmount: t.uangDibayar, change: t.kembalian,
      createdAt: t.createdAt,
      items: t.items.map((item) => ({
        productName: item.namaProduk, quantity: item.quantity,
        price: item.hargaSatuan, subtotal: item.subtotal,
      })),
    }));

    const normalizedOrders = orders.map((o) => ({
      id: o.id, transactionNumber: o.orderNumber, source: 'customer' as const,
      total: o.totalAmount, paymentMethod: mapPaymentMethod(o.paymentMethod || 'cash'),
      cashierName: 'Customer Order', customerName: o.customerName || '',
      tableInfo: o.table?.label || '', paymentAmount: o.totalAmount, change: 0,
      createdAt: o.createdAt,
      items: o.items.map((item) => ({
        productName: item.productName, quantity: item.quantity,
        price: item.price, subtotal: item.subtotal,
      })),
    }));

    const combined = [...normalizedTransactions, ...normalizedOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalRevenue = combined.reduce((s, t) => s + t.total, 0);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayRevenue = combined
      .filter((t) => new Date(t.createdAt) >= todayStart)
      .reduce((s, t) => s + t.total, 0);

    return NextResponse.json({
      transactions: combined,
      stats: {
        totalRevenue, totalTransactions: combined.length,
        averageTransaction: combined.length > 0 ? totalRevenue / combined.length : 0,
        todayRevenue,
      },
    });
  } catch (error) {
    console.error('Laporan error:', error);
    return NextResponse.json({ message: 'Gagal memuat laporan' }, { status: 500 });
  }
}
