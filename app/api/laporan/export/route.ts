import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import ExcelJS from 'exceljs';

const mapPaymentMethod = (method: string) => {
  const map: Record<string, string> = {
    TUNAI: 'Tunai', DEBIT: 'Kartu Debit', KREDIT: 'Kartu Kredit',
    QRIS: 'QRIS', TRANSFER: 'Transfer',
    cash: 'Tunai', qris: 'QRIS', transfer: 'Transfer',
    ewallet: 'E-Wallet', midtrans: 'Midtrans', card: 'Kartu',
  };
  return map[method] || method;
};

const formatDate = (d: Date) => {
  const date = new Date(d);
  const dd   = String(date.getDate()).padStart(2, '0');
  const mm   = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  const hh   = String(date.getHours()).padStart(2, '0');
  const min  = String(date.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filter      = searchParams.get('filter') || 'today';
    const customDay   = searchParams.get('day');
    const customMonth = searchParams.get('month');
    const customYear  = searchParams.get('year');

    // ─── Rentang tanggal ──────────────────────────────────────────────────────
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (filter === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      endDate   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (filter === 'week') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7); startDate.setHours(0,0,0,0);
    } else if (filter === 'month') {
      startDate = new Date(now); startDate.setDate(now.getDate() - 30); startDate.setHours(0,0,0,0);
    } else if (filter === 'custom' && customMonth && customYear) {
      const yr = parseInt(customYear), mo = parseInt(customMonth) - 1;
      if (customDay) {
        const dy = parseInt(customDay);
        startDate = new Date(yr, mo, dy, 0, 0, 0);
        endDate   = new Date(yr, mo, dy, 23, 59, 59);
      } else {
        startDate = new Date(yr, mo, 1, 0, 0, 0);
        endDate   = new Date(yr, mo + 1, 0, 23, 59, 59);
      }
    }

    const dateFilter = {
      ...(startDate && { gte: startDate }),
      ...(endDate   && { lte: endDate }),
    };

    // ─── Ambil data dari DB ───────────────────────────────────────────────────
    const [transactions, orders] = await Promise.all([
      prisma.transaction.findMany({
        where: { status: 'BERHASIL', ...(startDate && { createdAt: dateFilter }) },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.findMany({
        where: { status: 'COMPLETED', ...(startDate && { createdAt: dateFilter }) },
        include: { items: true, table: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // ─── Buat workbook ────────────────────────────────────────────────────────
    const wb = new ExcelJS.Workbook();
    wb.creator = 'POS UMKM';
    wb.created = new Date();

    const ws = wb.addWorksheet('Laporan Transaksi', {
      pageSetup: { fitToPage: true, orientation: 'landscape' },
    });

    // ─── Judul laporan ────────────────────────────────────────────────────────
    const filterLabel: Record<string, string> = {
      today: 'Hari Ini', week: '7 Hari Terakhir',
      month: '30 Hari Terakhir', custom: 'Periode Custom',
    };
    ws.mergeCells('A1:K1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `LAPORAN TRANSAKSI — ${filterLabel[filter] ?? filter}`;
    titleCell.font  = { name: 'Arial', bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 32;

    ws.mergeCells('A2:K2');
    const subCell = ws.getCell('A2');
    subCell.value = `Dicetak: ${formatDate(now)}`;
    subCell.font  = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF6B7280' } };
    subCell.alignment = { horizontal: 'center' };
    ws.getRow(2).height = 18;

    ws.addRow([]); // baris kosong pemisah

    // ─── Header kolom ─────────────────────────────────────────────────────────
    const HEADER_ROW = 4;
    const headers = [
      { header: 'No Transaksi',         width: 22 },
      { header: 'Sumber',               width: 16 },
      { header: 'Tanggal',              width: 20 },
      { header: 'Kasir / Customer',     width: 20 },
      { header: 'Meja',                 width: 10 },
      { header: 'Produk',               width: 28 },
      { header: 'Qty',                  width: 8  },
      { header: 'Harga Satuan (Rp)',    width: 20 },
      { header: 'Subtotal Produk (Rp)', width: 22 },
      { header: 'Total Transaksi (Rp)', width: 22 },
      { header: 'Metode Pembayaran',    width: 20 },
    ];

    headers.forEach((h, i) => { ws.getColumn(i + 1).width = h.width; });

    const headerRow = ws.getRow(HEADER_ROW);
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h.header;
      cell.font  = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFBFDBFE' } },
        bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
        left:   { style: 'thin', color: { argb: 'FFBFDBFE' } },
        right:  { style: 'thin', color: { argb: 'FFBFDBFE' } },
      };
    });
    headerRow.height = 28;

    // ─── Style helper ─────────────────────────────────────────────────────────
    const rupiahFmt = '#,##0';
    const borderStyle: Partial<ExcelJS.Borders> = {
      top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
    };

    const styleDataRow = (row: ExcelJS.Row, isAlt: boolean) => {
      const bg = isAlt ? 'FFF0F4FF' : 'FFFFFFFF';
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font   = { name: 'Arial', size: 10 };
        cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = borderStyle;
        if (colNum >= 7) cell.alignment = { horizontal: 'right',  vertical: 'middle' };
        else             cell.alignment = { horizontal: colNum === 1 ? 'left' : 'center', vertical: 'middle' };
      });
      row.height = 22;
    };

    // ─── Baris data ───────────────────────────────────────────────────────────
    let rowIndex  = HEADER_ROW + 1;
    let altToggle = false;
    let grandTotal = 0;

    for (const t of transactions) {
      grandTotal += t.total;
      for (const item of t.items) {
        const row = ws.getRow(rowIndex++);
        row.values = [
          t.nomorTransaksi, 'Kasir', formatDate(t.createdAt),
          t.kasir || 'Kasir', '-', item.namaProduk,
          item.quantity, item.hargaSatuan, item.subtotal,
          t.total, mapPaymentMethod(t.metodePembayaran),
        ];
        [8, 9, 10].forEach((col) => { row.getCell(col).numFmt = rupiahFmt; });
        styleDataRow(row, altToggle);
        altToggle = !altToggle;
      }
    }

    for (const o of orders) {
      grandTotal += o.totalAmount;
      for (const item of o.items) {
        const row = ws.getRow(rowIndex++);
        row.values = [
          o.orderNumber, 'Customer Order', formatDate(o.createdAt),
          o.customerName || 'Guest', o.table?.label || '-', item.productName,
          item.quantity, item.price, item.subtotal,
          o.totalAmount, mapPaymentMethod(o.paymentMethod || 'cash'),
        ];
        [8, 9, 10].forEach((col) => { row.getCell(col).numFmt = rupiahFmt; });
        styleDataRow(row, altToggle);
        altToggle = !altToggle;
      }
    }

    // ─── Baris total ──────────────────────────────────────────────────────────
    ws.addRow([]);
    const totalRow = ws.addRow(['', '', '', '', '', '', '', '', 'TOTAL KESELURUHAN', grandTotal, '']);
    totalRow.getCell(9).font      = { name: 'Arial', bold: true, size: 11 };
    totalRow.getCell(9).alignment = { horizontal: 'right' };
    totalRow.getCell(10).font     = { name: 'Arial', bold: true, size: 11, color: { argb: 'FF1E40AF' } };
    totalRow.getCell(10).numFmt   = rupiahFmt;
    totalRow.getCell(10).fill     = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    totalRow.height = 26;

    // ─── Freeze header ────────────────────────────────────────────────────────
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: HEADER_ROW, topLeftCell: 'A5' }];

    // ─── Kirim sebagai file .xlsx ─────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const filterSlug: Record<string, string> = {
    today: 'hari-ini',
    week: '7-hari',
    month: '30-hari',
    custom: 'custom',
    };
    
    const filename = `laporan-${filterSlug[filter] ?? filter}-${now.toISOString().slice(0, 10)}.xlsx`;

    // Gunakan Response standar (atau NextResponse tanpa casting)
    return new Response(buffer, {
    status: 200,
    headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${filename}"`,
    },
    });
  } catch (error) {
    console.error('Export laporan error:', error);
    return NextResponse.json({ message: 'Gagal export laporan' }, { status: 500 });
  }
}