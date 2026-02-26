// app/api/tables/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  const role     = req.headers.get('x-user-role');

  if (!tenantId && role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tables = await prisma.table.findMany({
      where: {
        isActive: true,
        ...(tenantId && { tenantId }),
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
  const role     = req.headers.get('x-user-role');

  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ✅ Hanya ADMIN dan SUPERADMIN yang boleh tambah meja
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return NextResponse.json({
      error: 'Forbidden',
      message: 'Hanya Admin yang dapat menambahkan meja',
    }, { status: 403 });
  }

  try {
    const body   = await req.json();
    const number = Number(body.number);
    const label  = body.label?.trim();

    if (!Number.isFinite(number) || number < 1) {
      return NextResponse.json({ message: 'Nomor meja tidak valid' }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ message: 'Label meja tidak boleh kosong' }, { status: 400 });
    }

    // Ambil outletId: dari body atau outlet pertama milik tenant
    let outletId = body.outletId;
    if (!outletId) {
      const outlet = await prisma.outlet.findFirst({ where: { tenantId } });
      if (!outlet) {
        return NextResponse.json({ message: 'Outlet tidak ditemukan untuk tenant ini' }, { status: 400 });
      }
      outletId = outlet.id;
    }

    // Cek duplikat nomor meja dalam outlet yang sama
    const existing = await prisma.table.findFirst({
      where: { number, outletId, isActive: true },
    });
    if (existing) {
      return NextResponse.json({ message: 'Nomor meja sudah terdaftar di outlet ini' }, { status: 409 });
    }

    const table = await prisma.table.create({
      data: {
        number,
        label,
        isActive: true,
        outletId,
        tenantId, // ✅ Selalu isi tenantId dari header, bukan dari body
      },
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