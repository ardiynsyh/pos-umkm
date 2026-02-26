// app/api/payment-qr/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 1. Gunakan Promise untuk Next.js 15
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Await params sebelum mengambil id
  const { id } = await params;

  try {
    const body = await req.json();

    const data = await prisma.paymentQR.update({
      // 3. PERBAIKAN: Gunakan id langsung (string) sesuai tipe di Prisma Schema
      // Jika di schema.prisma ID Anda adalah @id @default(cuid()) atau @id @default(uuid())
      where: { 
        id: id, // Hapus Number(id) jika di schema tipe id adalah String
        tenantId: tenantId 
      },
      data: {
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.qrCode !== undefined && { qrCode: body.qrCode }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating payment QR:', error);
    return NextResponse.json({ error: 'Gagal memperbarui QR: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.paymentQR.delete({
      where: { 
        id: id, // Gunakan id (string)
        tenantId: tenantId 
      },
    });

    return NextResponse.json({ success: true, message: 'QR Code berhasil dihapus' });
  } catch (error: any) {
    console.error('Error deleting payment QR:', error);
    return NextResponse.json({ error: 'Gagal menghapus QR: ' + error.message }, { status: 500 });
  }
}