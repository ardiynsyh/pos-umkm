import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  { params }: { params: any }
) {
  try {
    const { orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, table: true },
    });
    if (!order) {
      return NextResponse.json({ message: 'Order tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ message: 'Gagal memuat order' }, { status: 500 });
  }
}
