import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const data = await prisma.paymentQR.update({
     where: { id: Number(id) },
      data: {
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.qrCode !== undefined && { qrCode: body.qrCode }),
        ...(body.accountNumber !== undefined && { accountNumber: body.accountNumber }),
        ...(body.accountName !== undefined && { accountName: body.accountName }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    return NextResponse.json({ data });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'QR Code tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal mengupdate QR code' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await prisma.paymentQR.delete({ where: { id: Number(id) } }); // ✅ konversi ke number
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'QR Code tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Gagal menghapus QR code' }, { status: 500 });
  }
}
