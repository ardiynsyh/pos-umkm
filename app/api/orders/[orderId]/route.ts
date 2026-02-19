import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH update status pesanan (dipakai kasir)
export async function PATCH(
  req: Request,
  { params }: { params: any }
) {
  try {
    const { orderId } = await params;
    const { status, paymentStatus } = await req.json();

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(status && { status }),
        ...(paymentStatus && { paymentStatus }),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ message: 'Gagal update pesanan' }, { status: 500 });
  }
}
