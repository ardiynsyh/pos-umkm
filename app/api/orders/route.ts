// app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ── GET /api/orders ────────────────────────────────────────────────────────
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
        ...(tenantId && { tenantId }),
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
    return NextResponse.json(
      { success: false, error: 'Gagal memuat pesanan' },
      { status: 500 }
    );
  }
}

// ── POST /api/orders ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tableId, customerName, items, totalAmount, paymentMethod } = body;

    if (!tableId || !items?.length) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Generate order number berdasarkan count + timestamp
    const orderCount = await prisma.order.count({ where: { tenantId } });
    const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerName || null,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount: Number(totalAmount),
        paymentMethod: paymentMethod || null,
        tableId,   // ✅ scalar field langsung
        tenantId,  // ✅ scalar field langsung
        items: {
          create: items.map((item: {
            productId: string;
            productName: string;
            price: number | string;
            quantity: number | string;
          }) => ({
            productId: item.productId,
            productName: item.productName,
            price: Number(item.price),
            quantity: Number(item.quantity),
            subtotal: Number(item.price) * Number(item.quantity),
            // ✅ TIDAK ada tenantId di sini — field ini tidak ada di model OrderItem
          })),
        },
      },
      include: {
        table: true,
        items: true,
      },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Gagal membuat pesanan', detail: message },
      { status: 500 }
    );
  }
}

// ── PUT /api/orders ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { orderId, status, paymentStatus, paymentMethod } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID wajib diisi' },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: {
        id: orderId,
        tenantId, // ✅ security check: pastikan order milik tenant ini
      },
      data: {
        ...(status && { status: status as OrderStatus }),
        ...(paymentStatus && { paymentStatus: paymentStatus as PaymentStatus }),
        ...(paymentMethod && { paymentMethod }),
      },
      include: {
        table: true,
        items: true,
      },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: unknown) {
    console.error('Error updating order:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Gagal update pesanan', detail: message },
      { status: 500 }
    );
  }
}