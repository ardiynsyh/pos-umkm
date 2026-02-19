import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    const data = await prisma.paymentQR.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: 'Gagal memuat QR codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { provider, qrCode, accountNumber, accountName, isActive } = await request.json();

    const data = await prisma.paymentQR.create({
      data: { provider, qrCode, accountNumber, accountName, isActive: isActive ?? true },
    });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ message: 'Gagal menyimpan QR code' }, { status: 500 });
  }
}
