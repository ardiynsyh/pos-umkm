import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// GET semua order hari ini
export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { 
        createdAt: { gte: startOfDay } 
      },
      include: { 
        table: {
          include: {
            outlet: true
          }
        }, 
        items: true // Items tanpa include product dulu
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      success: true,
      orders 
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Gagal memuat pesanan' 
    }, { status: 500 });
  }
}

// POST untuk membuat order baru
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      tableId, 
      customerName, 
      items, 
      totalAmount,
      outletId 
    } = body;

    // Validasi
    if (!tableId || !items || !items.length) {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Generate order number
    const orderCount = await prisma.order.count();
    const orderNumber = `ORD-${String(orderCount + 1).padStart(3, '0')}`;

    // Buat order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        tableId,
        customerName: customerName || null,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.UNPAID,
        totalAmount,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            price: item.price,
            quantity: item.quantity,
            subtotal: item.price * item.quantity
          }))
        }
      },
      include: {
        table: true,
        items: true
      }
    });

    return NextResponse.json({ 
      success: true,
      order 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Gagal membuat pesanan: ' + error.message },
      { status: 500 }
    );
  }
}

// PUT untuk update status order
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, status, paymentStatus, paymentMethod } = body;

    const updateData: any = {};
    
    if (status) updateData.status = status;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        table: true,
        items: true
      }
    });

    return NextResponse.json({ 
      success: true,
      order 
    });

  } catch (error: any) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Gagal update pesanan: ' + error.message },
      { status: 500 }
    );
  }
}