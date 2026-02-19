import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: { stok: { gt: 0 } },
      include: { category: true },  // join kategori
      orderBy: { nama: 'asc' },
    });

    // Mapping ke field yang diharapkan frontend
    const mapped = products.map((p) => ({
      id: p.id,
      name: p.nama,
      price: p.hargaJual,
      stock: p.stok,
      category: p.category.nama,   // ambil nama dari relasi
      image: p.foto ?? null,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ message: 'Gagal memuat produk' }, { status: 500 });
  }
}