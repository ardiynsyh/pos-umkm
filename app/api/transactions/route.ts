import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { PaymentMethod, TransactionStatus } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nomorTransaksi,
      total,
      diskon,
      pajak,
      totalBayar,
      uangDibayar,
      kembalian,
      metodePembayaran,
      items,
      outletId,
      kasir, // Tambahkan kasir dari frontend
    } = body;

    // Validasi: Pastikan outletId ada
    let finalOutletId = outletId;

    if (!finalOutletId) {
      const defaultOutlet = await prisma.outlet.findFirst();
      if (!defaultOutlet) {
        return NextResponse.json(
          { error: 'No outlet found. Please create an outlet first.' },
          { status: 400 }
        );
      }
      finalOutletId = defaultOutlet.id;
    }

    // Validasi: Cek apakah outlet exists
    const outlet = await prisma.outlet.findUnique({
      where: { id: finalOutletId },
    });

    if (!outlet) {
      return NextResponse.json(
        { error: `Outlet with id '${finalOutletId}' not found` },
        { status: 404 }
      );
    }

    // Validasi: Cek apakah semua productId valid
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stok: true, nama: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter((id: string) => !foundIds.includes(id));
      return NextResponse.json(
        { error: `Products not found: ${missingIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Validasi: Cek stok cukup
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stok < item.quantity) {
        return NextResponse.json(
          { error: `Stok tidak cukup untuk produk "${product.nama}". Tersedia: ${product.stok}, Diminta: ${item.quantity}` },
          { status: 400 }
        );
      }
    }

    // Konversi metodePembayaran ke enum PaymentMethod
    let paymentMethodEnum: PaymentMethod;
    switch (metodePembayaran) {
      case 'cash':
        paymentMethodEnum = PaymentMethod.TUNAI;
        break;
      case 'card':
        paymentMethodEnum = PaymentMethod.DEBIT; // atau KREDIT
        break;
      case 'ewallet':
        paymentMethodEnum = PaymentMethod.QRIS;
        break;
      default:
        paymentMethodEnum = PaymentMethod.TUNAI;
    }

    // Gunakan Prisma transaction untuk atomicity
    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          nomorTransaksi,
          total,
          diskon: diskon || 0,
          pajak: pajak || 0,
          totalBayar,
          uangDibayar,
          kembalian,
          metodePembayaran: paymentMethodEnum,
          status: TransactionStatus.BERHASIL,
          kasir: kasir || 'Kasir',
          outletId: finalOutletId,
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              namaProduk: item.nama,
              quantity: item.quantity,
              hargaSatuan: item.hargaSatuan,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
        },
      });

      // Update stok products
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stok: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newTransaction;
    });

    return NextResponse.json({ 
      success: true,
      transaction 
    }, { status: 201 });
  } catch (error) {
    console.error('Transaction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create transaction', details: errorMessage },
      { status: 500 }
    );
  }
}

// GET /api/transactions - untuk mengambil daftar transaksi
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const outletId = searchParams.get('outletId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const whereClause: any = {};
    
    if (outletId) {
      whereClause.outletId = outletId;
    }
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: whereClause,
      include: {
        items: {
          include: {
            product: true
          }
        },
        outlet: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json({ 
      success: true,
      transactions 
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}