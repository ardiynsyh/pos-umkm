import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Memulai proses seeding...')

  // 1. Bersihkan data (Urutan: Produk -> Kategori -> Outlet)
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.outlet.deleteMany()

  // 2. Buat Outlet Default
  const outletUtama = await prisma.outlet.create({
    data: {
      nama: 'Toko Pusat Ardiyansyah',
      alamat: 'Jl. Utama No. 1',
    },
  })

  // 3. Buat Kategori Default
  const kategoryUtama = await prisma.category.create({
    data: {
      nama: 'Umum',
    },
  })

  // 4. Buat Produk (Sesuaikan field ke Bahasa Indonesia)
  const products = [
    {
      sku: '8850124101234',
      nama: 'Kopi Kenangan Mantan',
      hargaBeli: 12000,
      hargaJual: 18000,
      stok: 100, // Ganti dari 'stock' ke 'stok'
      satuan: 'pcs',
      category: { connect: { id: kategoryUtama.id } },
      outlet: { connect: { id: outletUtama.id } }
    },
    {
      sku: '8991234567890',
      nama: 'Roti O Original',
      hargaBeli: 8000,
      hargaJual: 12000,
      stok: 50, // Ganti dari 'stock' ke 'stok'
      satuan: 'pcs',
      category: { connect: { id: kategoryUtama.id } },
      outlet: { connect: { id: outletUtama.id } }
    },
    {
      sku: '1122334455',
      nama: 'Mineral Water 600ml',
      hargaBeli: 3000,
      hargaJual: 5000,
      stok: 200, // Ganti dari 'stock' ke 'stok'
      satuan: 'botol',
      category: { connect: { id: kategoryUtama.id } },
      outlet: { connect: { id: outletUtama.id } }
    }
  ]

  for (const p of products) {
    await prisma.product.create({
      data: p,
    })
  }

  console.log('✨ SEEDING BERHASIL TOTAL! Data sudah masuk semua.');
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })