// app/api/public/orders/route.ts  (atau path sesuai project kamu)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// ── GET: ambil pesanan hari ini (public, tanpa auth) ──────────────────────
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

// ── POST: buat pesanan baru dari QR code (public, tanpa auth) ─────────────
export async function POST(req: Request) {
  try {
    const { tableId, customerName, paymentMethod, items } = await req.json();

    if (!tableId || !items?.length) {
      return NextResponse.json(
        { message: 'tableId dan items wajib diisi' },
        { status: 400 }
      );
    }

    // ✅ Ambil table sekaligus tenantId-nya — wajib ada untuk Order
    const table = await prisma.table.findUnique({
      where: { id: tableId },
      select: { id: true, tenantId: true },
    });

    if (!table) {
      return NextResponse.json({ message: 'Meja tidak ditemukan' }, { status: 404 });
    }

    // Validasi produk & stok
    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    for (const item of items as { productId: string; quantity: number }[]) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Produk dengan ID ${item.productId} tidak ditemukan` },
          { status: 400 }
        );
      }
      if (product.stok < item.quantity) {
        return NextResponse.json(
          { message: `Stok ${product.nama} tidak cukup (tersisa ${product.stok})` },
          { status: 400 }
        );
      }
    }

    // Susun item order
    const orderItems = (items as { productId: string; quantity: number }[]).map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        productId:   product.id,
        productName: product.nama,
        price:       product.hargaJual,
        quantity:    item.quantity,
        subtotal:    product.hargaJual * item.quantity,
      };
    });

    const totalAmount = orderItems.reduce((s, i) => s + i.subtotal, 0);

    // ✅ Atomic transaction: buat order + kurangi stok
    const order = await prisma.$transaction(
      async (tx) => {
        // Hitung orderNumber berdasarkan tenant agar tidak bentrok antar tenant
        const count = await tx.order.count({ where: { tenantId: table.tenantId } });
        const orderNumber = `ORD-${String(count + 1).padStart(4, '0')}`;

        // ✅ tenantId disertakan → tidak ada lagi error type 'never'
        const newOrder = await tx.order.create({
          data: {
            orderNumber,
            tableId,
            tenantId:     table.tenantId,   // ✅ wajib ada
            customerName: customerName || 'Customer',
            paymentMethod: paymentMethod || null,
            totalAmount,
            status:        OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            items: {
              create: orderItems,
            },
          },
          include: { table: true, items: true },
        });

        // Kurangi stok setiap produk
        for (const item of items as { productId: string; quantity: number }[]) {
          await tx.product.update({
            where: { id: item.productId },
            data:  { stok: { decrement: item.quantity } },
          });
        }

        return newOrder;
      },
      { timeout: 15000 }
    );

    return NextResponse.json(
      { orderId: order.id, orderNumber: order.orderNumber },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal membuat pesanan';
    console.error('[POST /api/public/orders]', error);
    return NextResponse.json({ message }, { status: 400 });
  }
}