import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// @ts-ignore
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export async function POST(
  _req: Request,
  context: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await context.params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 });
    }

    // Jika sudah punya token yang valid, return langsung
    if (order.midtransToken) {
      return NextResponse.json({ token: order.midtransToken });
    }

    // Buat order ID unik untuk Midtrans
    const midtransOrderId = `${order.orderNumber}-${Date.now()}`;

    const parameter = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: order.totalAmount,
      },
      item_details: order.items.map((item: any) => ({
        id: item.productId,
        name: item.productName,
        price: item.price,
        quantity: item.quantity,
      })),
      customer_details: {
        first_name: order.customerName,
      },
    };

    const transaction = await snap.createTransaction(parameter);

    // Simpan token dan midtransOrderId ke database
    await prisma.order.update({
      where: { id: orderId },
      data: {
        midtransToken: transaction.token,
        midtransOrderId: midtransOrderId,
      },
    });

    return NextResponse.json({ token: transaction.token });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat transaksi' },
      { status: 500 }
    );
  }
}