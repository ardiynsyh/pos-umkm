import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE hapus meja
export async function DELETE(
  _req: Request,
  { params }: { params: any }
) {
  try {
    const { tableId } = await params;
    await prisma.table.update({
      where: { id: tableId },
      data: { isActive: false },
    });
    return NextResponse.json({ message: 'Meja dihapus' });
  } catch {
    return NextResponse.json({ message: 'Gagal hapus meja' }, { status: 500 });
  }
}
