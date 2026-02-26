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
        // Pastikan model Order Anda memiliki field tenantId
        ...(tenantId && { tenantId: tenantId }),
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

// ── POST /api/orders ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tableId, customerName, items, totalAmount } = body;

    if (!tableId || !items?.length) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Gunakan transaksi atau count untuk generate order number
    const orderCount = await prisma.order.count({ where: { tenantId } });
    const orderNumber = `ORD-${Date.now()}-${String(orderCount + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: customerName || null,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount: Number(totalAmount), // Pastikan bertipe Number
        // Gunakan field relasi eksplisit untuk menghindari error 'never'
        tenantId: tenantId, 
        tableId: tableId, 
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            price: Number(item.price),
            quantity: Number(item.quantity),
            subtotal: Number(item.price) * Number(item.quantity),
            tenantId: tenantId, // Sertakan tenantId di tiap item jika ada di skema
          })),
        },
      },
      include: { table: true, items: true },
    });

    return NextResponse.json({ success: true, order }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
        error: 'Gagal membuat pesanan', 
        detail: error.message 
    }, { status: 500 });
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
      return NextResponse.json({ error: 'Order ID wajib diisi' }, { status: 400 });
    }

    // Memastikan order yang diupdate milik tenant yang benar
    const order = await prisma.order.update({
      where: { 
        id: orderId,
        tenantId: tenantId // Security check
      },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentMethod && { paymentMethod }),
      },
      include: { table: true, items: true },
    });

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json({ 
        error: 'Gagal update pesanan', 
        detail: error.message 
    }, { status: 500 });
  }
}