import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startOfDay } },
      include: { table: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ message: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { tableId, customerName, paymentMethod, items } = await req.json();

    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error('Produk tidak ditemukan');
      if (product.stok < item.quantity) throw new Error(`Stok ${product.nama} tidak cukup`);
    }

    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId: product.id,
        productName: product.nama,
        price: product.hargaJual,
        quantity: item.quantity,
        subtotal: product.hargaJual * item.quantity,
      };
    });

    const totalAmount = orderItems.reduce((s: number, i: any) => s + i.subtotal, 0);

    const order = await prisma.$transaction(
      async (tx) => {
        const count = await tx.order.count();
        const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            tableId,
            customerName: customerName || 'Customer',
            paymentMethod,
            totalAmount,
            status: 'PENDING',
            paymentStatus: 'UNPAID',
            items: { create: orderItems },
          },
        });

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stok: { decrement: item.quantity } },
          });
        }

        return newOrder;
      },
      { timeout: 15000 }
    );

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat pesanan' },
      { status: 400 }
    );
  }
}