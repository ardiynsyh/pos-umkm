import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: Request,
  context: { params: Promise<{ tableId: string }> }
) {
  try {
    const { tableId } = await context.params;  // ← perbaikan di sini

    const table = await prisma.table.findUnique({
      where: { id: tableId, isActive: true },
    });

    if (!table) {
      return NextResponse.json({ message: 'Meja tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      id: table.id,
      number: table.number,
      label: table.label,
      outletId: table.outletId,
    });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat data meja' }, { status: 500 });
  }
}