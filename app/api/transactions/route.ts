// app/api/transactions/route.ts
// ✅ Setiap transaksi berhasil → stok produk otomatis berkurang
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function genNomor(): string {
  const d   = new Date();
  const pad = (n: number, l = 2) => String(n).padStart(l, '0');
  return `TRX${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${String(Math.random()).slice(2,6)}`;
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const outletId  = searchParams.get('outletId');
    const startDate = searchParams.get('startDate');
    const endDate   = searchParams.get('endDate');
    const limit     = parseInt(searchParams.get('limit') ?? '50');

    const where: any = {
      ...(tenantId && { tenantId }),
      ...(outletId  && { outletId }),
      ...(startDate && endDate && {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate + 'T23:59:59'),
        },
      }),
    };

    const [transactions, summary] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.transaction.aggregate({
        where: { ...where, status: 'BERHASIL' },
        _sum: { total: true },
        _count: true,
      }),
    ]);

    return NextResponse.json({
      transactions,
      summary: {
        total:  summary._sum.total  ?? 0,
        count:  summary._count,
      },
    });
  } catch (error) {
    console.error('[GET /api/transactions]', error);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const {
      outletId, kasir, pelanggan, catatan,
      metodePembayaran = 'TUNAI',
      uangDibayar, items,
      diskon = 0, pajak = 0,
    } = await req.json();

    if (!outletId || !items?.length) {
      return NextResponse.json({ error: 'outletId dan items wajib diisi' }, { status: 400 });
    }

    const resolvedTenantId = tenantId ?? (await prisma.outlet.findUnique({ where: { id: outletId } }))?.tenantId;
    if (!resolvedTenantId) {
      return NextResponse.json({ error: 'Outlet tidak ditemukan' }, { status: 404 });
    }

    // ── Validasi stok semua item sebelum transaksi ────────────────────────────
    const productIds   = items.map((i: any) => i.productId);
    const dbProducts   = await prisma.product.findMany({
      where: { id: { in: productIds }, outletId },
    });

    const stockErrors: string[] = [];
    for (const item of items) {
      const prod = dbProducts.find(p => p.id === item.productId);
      if (!prod) { stockErrors.push(`Produk ${item.namaProduk} tidak ditemukan`); continue; }
      if (prod.stok < item.quantity) {
        stockErrors.push(`Stok ${prod.nama} tidak cukup (tersisa ${prod.stok}, dibutuhkan ${item.quantity})`);
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: stockErrors.join('. ') }, { status: 400 });
    }

    // ── Kalkulasi ─────────────────────────────────────────────────────────────
    const total     = items.reduce((s: number, i: any) => s + i.subtotal, 0);
    const totalBayar = total - diskon + pajak;
    const kembalian  = Math.max((uangDibayar ?? totalBayar) - totalBayar, 0);

    // ── Transaksi + update stok dalam 1 atomic operation ─────────────────────
    const transaction = await prisma.$transaction(async (tx) => {
      // 1. Buat transaksi
      const trx = await tx.transaction.create({
        data: {
          nomorTransaksi: genNomor(),
          total, diskon, pajak, totalBayar,
          uangDibayar:     uangDibayar ?? totalBayar,
          kembalian,
          metodePembayaran,
          status:    'BERHASIL',
          kasir:     kasir ?? null,
          pelanggan: pelanggan ?? null,
          catatan:   catatan ?? null,
          outletId,
          tenantId:  resolvedTenantId,
          items: {
            create: items.map((i: any) => ({
              productId:   i.productId,
              namaProduk:  i.namaProduk,
              quantity:    i.quantity,
              hargaSatuan: i.hargaSatuan,
              subtotal:    i.subtotal,
            })),
          },
        },
        include: { items: true },
      });

      // 2. ✅ Kurangi stok setiap produk secara otomatis
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data:  { stok: { decrement: item.quantity } },
        });
      }

      return trx;
    });

    return NextResponse.json({ transaction }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/transactions]', error);
    return NextResponse.json({ error: 'Gagal membuat transaksi' }, { status: 500 });
  }
}