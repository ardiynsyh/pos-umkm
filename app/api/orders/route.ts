import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET semua order hari ini (untuk halaman kasir/pesanan)
export async function GET() {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: startOfDay } },
      include: { table: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ message: 'Gagal memuat pesanan' }, { status: 500 });
  }
}
