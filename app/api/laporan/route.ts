// app/api/laporan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// ── Timezone WIB (UTC+7) ──────────────────────────────────────────────────────
// Server Vercel/Node berjalan di UTC. User di Indonesia = WIB (UTC+7).
// Tanpa koreksi ini, "Hari Ini" di server = hari ini UTC, bukan hari ini WIB,
// sehingga transaksi jam 00:00–07:00 WIB tidak masuk filter "today".
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ambil year/month/date sesuai zona WIB dari Date UTC */
function wibParts(utcDate: Date) {
  const d = new Date(utcDate.getTime() + WIB_OFFSET_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

/**
 * Kembalikan { start, end } dalam UTC yang setara dengan
 * 00:00:00 WIB dan 23:59:59 WIB untuk tanggal WIB (year, month, day).
 */
function wibDayRange(year: number, month: number, day: number) {
  const start = new Date(Date.UTC(year, month, day,  0,  0,  0) - WIB_OFFSET_MS);
  const end   = new Date(Date.UTC(year, month, day, 23, 59, 59) - WIB_OFFSET_MS);
  return { start, end };
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter      = searchParams.get('filter') || 'today';
    const customDay   = searchParams.get('day');
    const customMonth = searchParams.get('month');
    const customYear  = searchParams.get('year');

    // Waktu "sekarang" dalam perspektif WIB
    const nowUTC = new Date();
    const wib    = wibParts(nowUTC);

    let startDate: Date | undefined;
    let endDate:   Date | undefined;

    if (filter === 'today') {
      // Hari ini menurut WIB, bukan UTC
      const r   = wibDayRange(wib.y, wib.m, wib.d);
      startDate = r.start;
      endDate   = r.end;

    } else if (filter === 'week') {
      // 00:00 WIB 7 hari lalu s/d 23:59 WIB hari ini
      startDate = wibDayRange(wib.y, wib.m, wib.d - 7).start;
      endDate   = wibDayRange(wib.y, wib.m, wib.d).end;

    } else if (filter === 'month') {
      // 00:00 WIB 30 hari lalu s/d 23:59 WIB hari ini
      startDate = wibDayRange(wib.y, wib.m, wib.d - 30).start;
      endDate   = wibDayRange(wib.y, wib.m, wib.d).end;

    } else if (filter === 'custom' && customMonth && customYear) {
      const yr = parseInt(customYear);
      const mo = parseInt(customMonth) - 1;
      if (customDay) {
        const r   = wibDayRange(yr, mo, parseInt(customDay));
        startDate = r.start;
        endDate   = r.end;
      } else {
        // Seluruh bulan
        const lastDay = new Date(yr, mo + 1, 0).getDate();
        startDate = wibDayRange(yr, mo, 1).start;
        endDate   = wibDayRange(yr, mo, lastDay).end;
      }
    }
    // filter === 'all' → tanpa filter tanggal

    const dateFilter   = { ...(startDate && { gte: startDate }), ...(endDate && { lte: endDate }) };
    const tenantFilter = tenantId ? { tenantId } : {};

    // ── Ambil semua data secara paralel ────────────────────────────────────────
    // ✅ Tabel pengeluaran = single source of truth, tidak perlu query pembelian terpisah
    const [transactions, orders, pengeluaran] = await Promise.all([

      prisma.transaction.findMany({
        where: { ...tenantFilter, status: 'BERHASIL', ...(startDate && { createdAt: dateFilter }) },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.order.findMany({
        where: { status: 'COMPLETED', ...(tenantId && { tenantId }), ...(startDate && { createdAt: dateFilter }) },
        include: { items: true, table: true },
        orderBy: { createdAt: 'desc' },
      }),

      // ✅ Semua pengeluaran (manual + otomatis dari pembelian) ada di sini
      prisma.pengeluaran.findMany({
        where: { ...tenantFilter, ...(startDate && { tanggal: dateFilter }) },
        orderBy: { tanggal: 'desc' },
      }),
    ]);

    const mapPaymentMethod = (method: string) => ({
      TUNAI: 'cash', DEBIT: 'card', KREDIT: 'card', QRIS: 'qris', TRANSFER: 'transfer',
      cash: 'cash', qris: 'qris', transfer: 'transfer', ewallet: 'ewallet', midtrans: 'card',
    }[method] || 'cash');

    const normalizedTransactions = transactions.map(t => ({
      id: t.id, transactionNumber: t.nomorTransaksi, source: 'kasir' as const,
      total: t.total, paymentMethod: mapPaymentMethod(t.metodePembayaran),
      cashierName: t.kasir || 'Kasir', customerName: t.pelanggan || '',
      tableInfo: '', paymentAmount: t.uangDibayar, change: t.kembalian,
      createdAt: t.createdAt,
      items: t.items.map(i => ({ productName: i.namaProduk, quantity: i.quantity, price: i.hargaSatuan, subtotal: i.subtotal })),
    }));

    const normalizedOrders = orders.map(o => ({
      id: o.id, transactionNumber: o.orderNumber, source: 'customer' as const,
      total: o.totalAmount, paymentMethod: mapPaymentMethod(o.paymentMethod || 'cash'),
      cashierName: 'Customer Order', customerName: o.customerName || '',
      tableInfo: o.table?.label || '', paymentAmount: o.totalAmount, change: 0,
      createdAt: o.createdAt,
      items: o.items.map(i => ({ productName: i.productName, quantity: i.quantity, price: i.price, subtotal: i.subtotal })),
    }));

    const combined = [...normalizedTransactions, ...normalizedOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // ── Summary keuangan ──────────────────────────────────────────────────────
    const KATEGORI_OTOMATIS = ['Pembelian Stok', 'Pembelian Stok (Sebagian)', 'Pelunasan Hutang'];
    const totalRevenue        = combined.reduce((s, t) => s + t.total, 0);
    // ✅ Pisah berdasarkan kategori — tidak perlu kolom sumber di DB
    const pengeluaranOtomatis = pengeluaran.filter(p => KATEGORI_OTOMATIS.includes(p.kategori));
    const pengeluaranManual   = pengeluaran.filter(p => !KATEGORI_OTOMATIS.includes(p.kategori));
    const totalPembelianStok  = pengeluaranOtomatis.reduce((s, p) => s + p.jumlah, 0);
    const totalBiayaOps       = pengeluaranManual.reduce((s, p) => s + p.jumlah, 0);
    const totalPengeluaran    = pengeluaran.reduce((s, p) => s + p.jumlah, 0);

    // todayRevenue juga pakai WIB
    const todayStart   = wibDayRange(wib.y, wib.m, wib.d).start;
    const todayRevenue = combined
      .filter(t => new Date(t.createdAt) >= todayStart)
      .reduce((s, t) => s + t.total, 0);

    // Ringkasan per kategori
    const pengeluaranPerKategori = pengeluaran.reduce<Record<string, number>>((acc, p) => {
      acc[p.kategori] = (acc[p.kategori] || 0) + p.jumlah;
      return acc;
    }, {});

    const pengeluaranList = pengeluaran.map(p => ({
      id:         p.id,
      tanggal:    p.tanggal.toISOString().slice(0, 10),
      kategori:   p.kategori,
      keterangan: p.keterangan,
      jumlah:     p.jumlah,
      source:     KATEGORI_OTOMATIS.includes(p.kategori) ? 'pembelian' as const : 'manual' as const,
    })).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    return NextResponse.json({
      transactions: combined,
      stats: {
        totalRevenue,
        totalTransactions: combined.length,
        averageTransaction: combined.length > 0 ? totalRevenue / combined.length : 0,
        todayRevenue,
      },
      keuangan: {
        totalPendapatan:       totalRevenue,
        totalPengeluaran,
        totalPembelianStok,
        totalBiayaOperasional: totalBiayaOps,
        labaKotor:             totalRevenue - totalPembelianStok,
        labaBersih:            totalRevenue - totalPengeluaran,
      },
      pengeluaranList,
      pengeluaranPerKategori,
    });

  } catch (error) {
    console.error('[GET /api/laporan]', error);
    return NextResponse.json({ message: 'Gagal memuat laporan' }, { status: 500 });
  }
}