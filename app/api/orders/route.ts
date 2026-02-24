// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startOfDay },
        // Filter via outlet yang terhubung ke tenant
        ...(tenantId && { table: { outlet: { tenantId } } }),
      },
      include: {
        table: { include: { outlet: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, orders });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat pesanan' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { tableId, customerName, items, totalAmount } = await req.json();
    if (!tableId || !items?.length) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber, tableId,
        customerName: customerName || null,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId, productName: item.productName,
            price: item.price, quantity: item.quantity,
            subtotal: item.price * item.quantity,
          })),
        },
      },
      include: { table: true, items: true },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Gagal membuat pesanan: ' + error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, status, paymentStatus, paymentMethod } = await req.json();
    const updateData: any = {};
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: { table: true, items: true },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Gagal update pesanan: ' + error.message }, { status: 500 });
  }
}