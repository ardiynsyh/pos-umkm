import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { PaymentStatus } from '@prisma/client';
import crypto from 'crypto';

// Midtrans otomatis kirim notifikasi ke sini setiap ada perubahan status pembayaran
// Daftarkan URL ini di Midtrans Dashboard → Settings → Configuration → Payment Notification URL
// Contoh URL: https://pos-umkm-psi.vercel.app/api/midtrans/webhook

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      order_id,
      transaction_status,
      fraud_status,
      signature_key,
      gross_amount,
      status_code,
    } = body;

    // Verifikasi bahwa notifikasi benar dari Midtrans
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const expectedSignature = crypto
      .createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex');

    if (signature_key !== expectedSignature) {
      return NextResponse.json({ message: 'Invalid signature' }, { status: 403 });
    }

    // Tentukan status pembayaran
    let paymentStatus: PaymentStatus = 'UNPAID';
    if (transaction_status === 'capture' && fraud_status === 'accept') {
      paymentStatus = 'PAID';
    } else if (transaction_status === 'settlement') {
      paymentStatus = 'PAID';
    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      paymentStatus = 'UNPAID';
    } else if (transaction_status === 'refund') {
      paymentStatus = 'REFUNDED';
    }

    // Update database
    await prisma.order.update({
      where: { midtransOrderId: order_id },
      data: { paymentStatus },
    });

    return NextResponse.json({ message: 'OK' });
  } catch (error) {
    return NextResponse.json({ message: 'Webhook error' }, { status: 500 });
  }
}
