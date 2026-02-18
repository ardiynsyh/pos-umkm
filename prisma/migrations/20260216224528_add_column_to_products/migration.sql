-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'KASIR', 'MANAGER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('TUNAI', 'DEBIT', 'KREDIT', 'QRIS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('BERHASIL', 'TERTUNDA', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'KASIR',
    "outletId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlets" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "telepon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "categoryId" TEXT NOT NULL,
    "hargaBeli" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hargaJual" DOUBLE PRECISION NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "stokMinimal" INTEGER NOT NULL DEFAULT 5,
    "satuan" TEXT NOT NULL DEFAULT 'pcs',
    "foto" TEXT,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "nomorTransaksi" TEXT NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "diskon" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pajak" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBayar" DOUBLE PRECISION NOT NULL,
    "uangDibayar" DOUBLE PRECISION NOT NULL,
    "kembalian" DOUBLE PRECISION NOT NULL,
    "metodePembayaran" "PaymentMethod" NOT NULL DEFAULT 'TUNAI',
    "status" "TransactionStatus" NOT NULL DEFAULT 'BERHASIL',
    "kasir" TEXT,
    "pelanggan" TEXT,
    "catatan" TEXT,
    "outletId" TEXT NOT NULL,
    "isSynced" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_items" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "namaProduk" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "hargaSatuan" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_sku_idx" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_nomorTransaksi_key" ON "transactions"("nomorTransaksi");

-- CreateIndex
CREATE INDEX "transactions_nomorTransaksi_idx" ON "transactions"("nomorTransaksi");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_items" ADD CONSTRAINT "transaction_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
