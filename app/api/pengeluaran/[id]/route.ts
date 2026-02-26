// app/api/pengeluaran/[id]/route.ts
// ✅ PUT    — Edit pengeluaran manual
// ✅ DELETE — Hapus pengeluaran + ROLLBACK stok jika kategori Pembelian Stok

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { tanggal, kategori, keterangan, jumlah } = await request.json();

    const existing = await prisma.pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }

    // Pembelian Stok tidak bisa diedit langsung — harus hapus & buat baru
    if (existing.sumber === 'pembelian' || existing.sumber === 'pelunasan') {
      return NextResponse.json(
        { message: 'Pembelian stok tidak bisa diedit. Hapus lalu buat ulang.' },
        { status: 403 }
      );
    }

    const item = await prisma.pengeluaran.update({
      where: { id },
      data:  { tanggal: new Date(tanggal), kategori, keterangan, jumlah: Number(jumlah) },
    });

    return NextResponse.json({ data: item });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengupdate pengeluaran' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existing = await prisma.pengeluaran.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }

    // ✅ Jika Pembelian Stok → rollback stok produk sebelum hapus
    if (existing.sumber === 'pembelian' && existing.items) {
      const itemList = existing.items as Array<{
        productId: string;
        jumlah: number;
        hargaBeli: number;
      }>;

      await prisma.$transaction(
        async (tx) => {
          // Rollback stok setiap produk
          for (const item of itemList) {
            await tx.product.update({
              where: { id: item.productId },
              data:  { stok: { decrement: item.jumlah } },
            });
          }
          await tx.pengeluaran.delete({ where: { id } });
        },
        { timeout: 15000, maxWait: 5000 }
      );

      return NextResponse.json({ message: 'Pembelian stok dihapus, stok produk dikembalikan' });
    }

    // Pengeluaran biasa — hapus langsung
    await prisma.pengeluaran.delete({ where: { id } });
    return NextResponse.json({ message: 'Berhasil dihapus' });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Data tidak ditemukan' }, { status: 404 });
    }
    console.error('[DELETE /api/pengeluaran/[id]]', error);
    return NextResponse.json({ message: 'Gagal menghapus pengeluaran' }, { status: 500 });
  }
}
