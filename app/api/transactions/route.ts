// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod, TransactionStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { nomorTransaksi, total, diskon, pajak, totalBayar, uangDibayar, kembalian, metodePembayaran, items, outletId, kasir } = body;

    // Pastikan outlet milik tenant ini
    let finalOutletId = outletId;
    if (!finalOutletId) {
      const defaultOutlet = await prisma.outlet.findFirst({ where: { tenantId } });
      if (!defaultOutlet) return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 400 });
      finalOutletId = defaultOutlet.id;
    }

    const outlet = await prisma.outlet.findUnique({ where: { id: finalOutletId } });
    if (!outlet || outlet.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Outlet tidak valid' }, { status: 403 });
    }

    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: { id: true, stok: true, nama: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter((id: string) => !foundIds.includes(id));
      return NextResponse.json({ error: `Products not found: ${missingIds.join(', ')}` }, { status: 404 });
    }

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stok < item.quantity) {
        return NextResponse.json({
          error: `Stok tidak cukup untuk "${product.nama}". Tersedia: ${product.stok}, Diminta: ${item.quantity}`,
        }, { status: 400 });
      }
    }

    let paymentMethodEnum: PaymentMethod;
    switch (metodePembayaran) {
      case 'cash':   paymentMethodEnum = PaymentMethod.TUNAI; break;
      case 'card':   paymentMethodEnum = PaymentMethod.DEBIT; break;
      case 'ewallet': paymentMethodEnum = PaymentMethod.QRIS; break;
      default:       paymentMethodEnum = PaymentMethod.TUNAI;
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          nomorTransaksi, total, diskon: diskon || 0, pajak: pajak || 0,
          totalBayar, uangDibayar, kembalian,
          metodePembayaran: paymentMethodEnum,
          status: TransactionStatus.BERHASIL,
          kasir: kasir || 'Kasir',
          outletId: finalOutletId,
          tenantId,          // ← inject tenantId
          items: {
            create: items.map((item: any) => ({
              productId: item.productId, namaProduk: item.nama,
              quantity: item.quantity, hargaSatuan: item.hargaSatuan, subtotal: item.subtotal,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stok: { decrement: item.quantity } },
        });
      }

      return newTransaction;
    });

    return NextResponse.json({ success: true, transaction }, { status: 201 });
  } catch (error) {
    console.error('Transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create transaction', details: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId  = searchParams.get('outletId');
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const limit     = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const transactions = await prisma.transaction.findMany({
      where: {
        ...(tenantId && { tenantId }),
        ...(outletId && { outletId }),
        ...(startDate && endDate && { createdAt: { gte: new Date(startDate), lte: new Date(endDate) } }),
      },
      include: { items: { include: { product: true } }, outlet: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}