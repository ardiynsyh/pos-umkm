import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: false, // ganti true saat go-live
  serverKey: process.env.MIDTRANS_SERVER_KEY!,
  clientKey: process.env.MIDTRANS_CLIENT_KEY!,
});

export async function POST(req: Request) {
  try {
    const { tableId, customerName, paymentMethod, items } = await req.json();

    // Validasi & ambil data produk
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    // Cek stok
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new Error(`Produk tidak ditemukan`);
      if (product.stok < item.quantity) {
        throw new Error(`Stok ${product.nama} tidak cukup`);
      }
    }

    // Siapkan item order
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

    // Generate nomor order unik
    const count = await prisma.order.count();
    const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

    // Buat order + kurangi stok (dalam 1 transaksi database)
    const order = await prisma.$transaction(async (tx) => {
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stok: { decrement: item.quantity } },
        });
      }
      return tx.order.create({
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
    });

    // Buat Snap token jika bayar online
    let snapToken = null;
    if (paymentMethod === 'midtrans') {
      const transaction = await (snap as any).createTransaction({
        transaction_details: {
          order_id: order.id,
          gross_amount: totalAmount,
        },
        customer_details: {
          first_name: customerName || 'Customer',
        },
        item_details: orderItems.map((i: any) => ({
          id: i.productId,
          price: i.price,
          quantity: i.quantity,
          name: i.productName,
        })),
      });
      snapToken = transaction.token;

      await prisma.order.update({
        where: { id: order.id },
        data: {
          midtransToken: snapToken,
          midtransOrderId: order.id,
        },
      });
    }

    return NextResponse.json({ orderId: order.id, orderNumber, snapToken });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Gagal membuat pesanan' },
      { status: 400 }
    );
  }
}
