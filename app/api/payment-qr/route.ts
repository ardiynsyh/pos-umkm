// app/api/payment-qr/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await prisma.paymentQR.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, qrCode, accountNumber, accountName, isActive } = body;

    // Pastikan field wajib diisi (sesuaikan dengan kebutuhan Anda)
    if (!provider || !qrCode) {
      return NextResponse.json({ error: 'Provider dan QR Code wajib diisi' }, { status: 400 });
    }

    const data = await prisma.paymentQR.create({
      data: { 
        provider, 
        qrCode, 
        accountNumber: accountNumber || null, 
        accountName: accountName || null, 
        isActive: isActive ?? true,
        // PERBAIKAN: Hubungkan ke tenantId yang didapat dari header
        tenantId: tenantId 
      },
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating payment QR:', error);
    return NextResponse.json({ 
      error: 'Gagal membuat QR Code', 
      detail: error.message 
    }, { status: 500 });
  }
}