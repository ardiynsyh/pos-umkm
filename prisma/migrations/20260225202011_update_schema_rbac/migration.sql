/*
  Warnings:

  - You are about to drop the `Absensi` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GajiSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Jadwal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LogAktivitas` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrderItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payroll` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Table` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `paymentQR` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[sku,outletId]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[barcode,outletId]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Absensi" DROP CONSTRAINT "Absensi_outletId_fkey";

-- DropForeignKey
ALTER TABLE "Absensi" DROP CONSTRAINT "Absensi_userId_fkey";

-- DropForeignKey
ALTER TABLE "GajiSetting" DROP CONSTRAINT "GajiSetting_userId_fkey";

-- DropForeignKey
ALTER TABLE "Jadwal" DROP CONSTRAINT "Jadwal_outletId_fkey";

-- DropForeignKey
ALTER TABLE "Jadwal" DROP CONSTRAINT "Jadwal_userId_fkey";

-- DropForeignKey
ALTER TABLE "LogAktivitas" DROP CONSTRAINT "LogAktivitas_outletId_fkey";

-- DropForeignKey
ALTER TABLE "LogAktivitas" DROP CONSTRAINT "LogAktivitas_userId_fkey";

-- DropForeignKey
ALTER TABLE "Order" DROP CONSTRAINT "Order_tableId_fkey";

-- DropForeignKey
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Payroll" DROP CONSTRAINT "Payroll_outletId_fkey";

-- DropForeignKey
ALTER TABLE "Payroll" DROP CONSTRAINT "Payroll_userId_fkey";

-- DropForeignKey
ALTER TABLE "Table" DROP CONSTRAINT "Table_outletId_fkey";

-- DropIndex
DROP INDEX "products_barcode_idx";

-- DropIndex
DROP INDEX "products_barcode_key";

-- DropIndex
DROP INDEX "products_sku_idx";

-- DropIndex
DROP INDEX "products_sku_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "tenantId" TEXT;

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "maxUsers" SET DEFAULT 5;

-- DropTable
DROP TABLE "Absensi";

-- DropTable
DROP TABLE "GajiSetting";

-- DropTable
DROP TABLE "Jadwal";

-- DropTable
DROP TABLE "LogAktivitas";

-- DropTable
DROP TABLE "Order";

-- DropTable
DROP TABLE "OrderItem";

-- DropTable
DROP TABLE "Payroll";

-- DropTable
DROP TABLE "Table";

-- DropTable
DROP TABLE "paymentQR";

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "outletId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "midtransToken" TEXT,
    "midtransOrderId" TEXT,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "tableId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_qr" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_qr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "absensi" (
    "id" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "jamMasuk" TEXT,
    "jamKeluar" TEXT,
    "shift" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "keterangan" TEXT,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal" (
    "id" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "keterangan" TEXT,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "log_aktivitas" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "ipAddress" TEXT,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "log_aktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll" (
    "id" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "hariKerja" INTEGER NOT NULL DEFAULT 0,
    "lemburJam" INTEGER NOT NULL DEFAULT 0,
    "gajiPokok" INTEGER NOT NULL DEFAULT 0,
    "tunjangan" INTEGER NOT NULL DEFAULT 0,
    "lemburNominal" INTEGER NOT NULL DEFAULT 0,
    "potongan" INTEGER NOT NULL DEFAULT 0,
    "totalGaji" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tanggalBayar" TEXT,
    "catatan" TEXT,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gaji_settings" (
    "id" TEXT NOT NULL,
    "skema" TEXT NOT NULL DEFAULT 'bulanan',
    "gajiPokok" INTEGER NOT NULL DEFAULT 0,
    "gajiHarian" INTEGER NOT NULL DEFAULT 0,
    "tunjangan" INTEGER NOT NULL DEFAULT 0,
    "tarifLembur" INTEGER NOT NULL DEFAULT 0,
    "potonganTerlambat" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gaji_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tables_number_outletId_key" ON "tables"("number", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_midtransOrderId_key" ON "orders"("midtransOrderId");

-- CreateIndex
CREATE INDEX "orders_tenantId_idx" ON "orders"("tenantId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "payment_qr_tenantId_idx" ON "payment_qr"("tenantId");

-- CreateIndex
CREATE INDEX "absensi_tanggal_idx" ON "absensi"("tanggal");

-- CreateIndex
CREATE INDEX "absensi_outletId_idx" ON "absensi"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "absensi_userId_tanggal_key" ON "absensi"("userId", "tanggal");

-- CreateIndex
CREATE INDEX "jadwal_tanggal_idx" ON "jadwal"("tanggal");

-- CreateIndex
CREATE INDEX "jadwal_outletId_idx" ON "jadwal"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "jadwal_userId_tanggal_key" ON "jadwal"("userId", "tanggal");

-- CreateIndex
CREATE INDEX "log_aktivitas_userId_idx" ON "log_aktivitas"("userId");

-- CreateIndex
CREATE INDEX "log_aktivitas_outletId_idx" ON "log_aktivitas"("outletId");

-- CreateIndex
CREATE INDEX "log_aktivitas_type_idx" ON "log_aktivitas"("type");

-- CreateIndex
CREATE INDEX "log_aktivitas_createdAt_idx" ON "log_aktivitas"("createdAt");

-- CreateIndex
CREATE INDEX "payroll_periode_idx" ON "payroll"("periode");

-- CreateIndex
CREATE INDEX "payroll_outletId_idx" ON "payroll"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_userId_periode_key" ON "payroll"("userId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "gaji_settings_userId_key" ON "gaji_settings"("userId");

-- CreateIndex
CREATE INDEX "products_outletId_idx" ON "products"("outletId");

-- CreateIndex
CREATE INDEX "products_tenantId_idx" ON "products"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_outletId_key" ON "products"("sku", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_outletId_key" ON "products"("barcode", "outletId");

-- CreateIndex
CREATE INDEX "shifts_outletId_idx" ON "shifts"("outletId");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "transactions_outletId_idx" ON "transactions"("outletId");

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_qr" ADD CONSTRAINT "payment_qr_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "absensi" ADD CONSTRAINT "absensi_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jadwal" ADD CONSTRAINT "jadwal_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "log_aktivitas" ADD CONSTRAINT "log_aktivitas_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payroll" ADD CONSTRAINT "payroll_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gaji_settings" ADD CONSTRAINT "gaji_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
