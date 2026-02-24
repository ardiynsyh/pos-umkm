// app/api/tables/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role = req.headers.get('x-user-role');
  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tables = await prisma.table.findMany({
      where: {
        isActive: true,
        ...(tenantId && { outlet: { tenantId } }),
      },
      orderBy: { number: 'asc' },
    });
    return NextResponse.json(tables);
  } catch {
    return NextResponse.json({ message: 'Gagal memuat meja' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const number = Number(body.number);
    const label = body.label;

    if (!Number.isFinite(number)) {
      return NextResponse.json({ message: 'Nomor meja tidak valid' }, { status: 400 });
    }

    // Gunakan outletId dari body atau ambil outlet pertama milik tenant
    let outletId = body.outletId;
    if (!outletId) {
      const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
      outletId = outlet?.id;
    }

    const table = await prisma.table.upsert({
      where: { number },
      update: { label, isActive: true },
      create: { number, label, isActive: true, outletId },
    });
    return NextResponse.json(table);
  } catch (error: any) {
    console.error('POST /api/tables error', error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'Nomor meja sudah terdaftar' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Gagal menambah meja' }, { status: 500 });
  }
}