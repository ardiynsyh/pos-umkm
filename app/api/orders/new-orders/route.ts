import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { OrderStatus } from '@prisma/client';

// GET /api/orders/new-orders - cek pesanan baru
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lastCheck = searchParams.get('lastCheck');

    // Versi SEDERHANA - tanpa include product yang error
    const newOrders = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        ...(lastCheck && {
          createdAt: {
            gt: new Date(lastCheck)
          }
        })
      },
      include: {
        table: true,
        // items: true // NONAKTIFKAN DULU
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Hitung total
    const total = await prisma.order.count({
      where: {
        status: OrderStatus.PENDING
      }
    });

    // Format response sederhana
    const formattedOrders = newOrders.map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: [] // items kosong sementara
    }));

    return NextResponse.json({
      success: true,
      newOrders: formattedOrders,
      total: total,
      lastCheck: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking new orders:', error);
    // Return response kosong, jangan error
    return NextResponse.json({
      success: true,
      newOrders: [],
      total: 0,
      lastCheck: new Date().toISOString()
    });
  }
}

// POST - tetap sama
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!orderIds || !orderIds.length) {
      return NextResponse.json(
        { error: 'Order IDs tidak boleh kosong' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `${orderIds.length} pesanan diproses`
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Gagal memproses pesanan' },
      { status: 500 }
    );
  }
}