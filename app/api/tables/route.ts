import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET semua meja
export async function GET() {
  try {
    const tables = await prisma.table.findMany({
      where: { isActive: true },
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(tables);
  } catch {
    return NextResponse.json({ message: 'Gagal memuat meja' }, { status: 500 });
  }
}

// POST tambah meja baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const number = Number(body.number);
    const label = body.label;

    if (!Number.isFinite(number)) {
      return NextResponse.json({ message: 'Nomor meja tidak valid' }, { status: 400 });
    }

    // use upsert to create or update table atomically and avoid unique constraint errors
    const table = await prisma.table.upsert({
      where: { number },
      update: { label, isActive: true },
      create: { number, label, isActive: true, outletId: body.outletId },
    });
    return NextResponse.json(table);
  } catch (error: any) {
    // log the error to server console for debugging
    // eslint-disable-next-line no-console
    console.error('POST /api/tables error', error);

    // handle unique constraint (nomor meja unik)
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'Nomor meja sudah terdaftar' }, { status: 409 });
    }

    return NextResponse.json({ message: 'Gagal menambah meja' }, { status: 500 });
  }
}
