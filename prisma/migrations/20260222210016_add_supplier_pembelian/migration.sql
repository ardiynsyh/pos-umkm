-- CreateEnum
CREATE TYPE "StatusPembelian" AS ENUM ('LUNAS', 'BELUM_LUNAS', 'SEBAGIAN');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "alamat" TEXT,
    "hutang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembelian" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "supplierId" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "dibayar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sisaHutang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusPembelian" NOT NULL DEFAULT 'BELUM_LUNAS',
    "keterangan" TEXT,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pembelian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pembelian_items" (
    "id" TEXT NOT NULL,
    "pembelianId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL,
    "hargaBeli" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "pembelian_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembelian" ADD CONSTRAINT "pembelian_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembelian" ADD CONSTRAINT "pembelian_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembelian_items" ADD CONSTRAINT "pembelian_items_pembelianId_fkey" FOREIGN KEY ("pembelianId") REFERENCES "pembelian"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembelian_items" ADD CONSTRAINT "pembelian_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
