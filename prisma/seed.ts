// prisma/seed.ts
// Jalankan dengan: npx prisma db seed

import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function hashPassword(password: string): Promise<string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const bcrypt = require('bcryptjs')
    return bcrypt.hash(password, 12)
  } catch {
    const salt = randomBytes(16).toString('hex')
    const hash = createHash('sha256').update(salt + password).digest('hex')
    console.warn('   ⚠️  bcryptjs tidak ditemukan — pakai SHA-256 fallback.')
    console.warn('      Jalankan: npm install bcryptjs  lalu seed ulang.\n')
    return `sha256:${salt}:${hash}`
  }
}

function createSlug(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

async function main() {
  console.log('🌱 Memulai proses seeding...\n')

  // ── 1. Bersihkan data lama ─────────────────────────────────────────────────
  console.log('🗑  Membersihkan data lama...')
  await prisma.transactionItem.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.shift.deleteMany()
  await prisma.salesTarget.deleteMany()
  await prisma.menuPermission.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.outlet.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()
  console.log('   ✅ Data lama bersih\n')

  // ── 2. Buat SUPERADMIN ────────────────────────────────────────────────────
  console.log('👑 Membuat akun SUPERADMIN...')
  const superAdmin = await prisma.user.create({
    data: {
      nama:     'Super Admin',
      email:    'superadmin@posumkm.com',
      password: await hashPassword('superadmin123'),
      role:     'SUPERADMIN',
    },
  })
  console.log(`   ✅ SUPERADMIN: ${superAdmin.email}\n`)

  // ── 3. Buat Tenant ────────────────────────────────────────────────────────
  console.log('🏢 Membuat tenant default...')
  const namaTenant = 'Toko Pusat Ardiyansyah'
  const tenant = await prisma.tenant.create({
    data: {
      nama:        namaTenant,
      slug:        createSlug(namaTenant),
      email:       'owner@tokoardiyansyah.com',
      plan:        'PRO',
      maxOutlets:  99,
      maxUsers:    999,
      isActive:    true,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  })
  console.log(`   ✅ Tenant: ${tenant.nama} (slug: ${tenant.slug})\n`)

  // ── 4. Buat Outlet ────────────────────────────────────────────────────────
  console.log('🏪 Membuat outlet...')
  const outlet = await prisma.outlet.create({
    data: {
      nama:     namaTenant,
      alamat:   'Jl. Utama No. 1',
      tenantId: tenant.id,
    },
  })
  console.log(`   ✅ Outlet: ${outlet.nama}\n`)

  // ── 5. Buat Owner ─────────────────────────────────────────────────────────
  console.log('👤 Membuat akun Owner...')
  const owner = await prisma.user.create({
    data: {
      nama:     'Ardiyansyah',
      email:    'owner@tokoardiyansyah.com',
      password: await hashPassword('owner123456'),
      role:     'ADMIN',
      tenantId: tenant.id,
      outletId: outlet.id,
    },
  })
  console.log(`   ✅ Owner: ${owner.email}\n`)

  // ── 6. Buat Kategori ──────────────────────────────────────────────────────
  console.log('🏷  Membuat kategori...')
  const kategoriUtama = await prisma.category.create({
    data: { nama: 'Umum' },
  })
  const kategoriMinuman = await prisma.category.create({
    data: { nama: 'Minuman' },
  })
  console.log(`   ✅ Kategori: ${kategoriUtama.nama}, ${kategoriMinuman.nama}\n`)

  // ── 7. Buat Produk ────────────────────────────────────────────────────────
  console.log('📦 Membuat produk...')
  const products = [
    {
      sku:        '8850124101234',
      nama:       'Kopi Kenangan Mantan',
      hargaBeli:  12000,
      hargaJual:  18000,
      stok:       100,
      satuan:     'pcs',
      tenantId:   tenant.id,
      outletId:   outlet.id,
      categoryId: kategoriMinuman.id,
    },
    {
      sku:        '8991234567890',
      nama:       'Roti O Original',
      hargaBeli:  8000,
      hargaJual:  12000,
      stok:       50,
      satuan:     'pcs',
      tenantId:   tenant.id,
      outletId:   outlet.id,
      categoryId: kategoriUtama.id,
    },
    {
      sku:        '1122334455',
      nama:       'Mineral Water 600ml',
      hargaBeli:  3000,
      hargaJual:  5000,
      stok:       200,
      satuan:     'botol',
      tenantId:   tenant.id,
      outletId:   outlet.id,
      categoryId: kategoriMinuman.id,
    },
  ]

  for (const p of products) {
    const created = await prisma.product.create({ data: p })
    console.log(`   ✅ ${created.nama}`)
  }

  // ── 8. Ringkasan ──────────────────────────────────────────────────────────
  console.log('\n✨ SEEDING BERHASIL!\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  👑 SUPERADMIN')
  console.log('     Email    : superadmin@posumkm.com')
  console.log('     Password : superadmin123')
  console.log('')
  console.log('  👤 OWNER TENANT')
  console.log(`     Email    : ${owner.email}`)
  console.log('     Password : owner123456')
  console.log(`     Tenant   : ${tenant.nama}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('⚠️  Ganti password setelah pertama login!\n')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error('❌ Seeding gagal:', e)
    await prisma.$disconnect()
    process.exit(1)
  })