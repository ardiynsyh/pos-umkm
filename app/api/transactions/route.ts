import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

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
      outletId, // Terima outletId dari request body
    } = body;

    // Validasi: Pastikan outletId ada
    // Jika tidak dikirim, gunakan outlet pertama yang tersedia
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

    // Gunakan Prisma transaction untuk atomicity
    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction record
      const newTransaction = await tx.transaction.create({
        data: {
          nomorTransaksi,
          total,
          diskon,
          pajak,
          totalBayar,
          uangDibayar,
          kembalian,
          metodePembayaran,
          status: 'BERHASIL',
          outletId: finalOutletId, // Gunakan outletId yang valid
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
          items: true,
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

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('Transaction error:', error);

    // Better error response untuk debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create transaction', details: errorMessage },
      { status: 500 }
    );
  }
}
