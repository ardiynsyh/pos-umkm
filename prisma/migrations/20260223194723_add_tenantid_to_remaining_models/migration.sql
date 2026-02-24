-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO');

-- DropIndex
DROP INDEX "menu_permissions_menuKey_role_key";

-- CreateTable tenants DULU sebelum add foreign key
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxOutlets" INTEGER NOT NULL DEFAULT 1,
    "maxUsers" INTEGER NOT NULL DEFAULT 3,
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_email_key" ON "tenants"("email");

-- Insert tenant default dari data yang sudah ada
INSERT INTO "tenants" ("id", "nama", "slug", "email", "plan", "isActive", "maxOutlets", "maxUsers", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE((SELECT nama FROM outlets LIMIT 1), 'Toko Utama'),
  'toko-utama',
  COALESCE((SELECT email FROM users WHERE role IN ('SUPERADMIN','ADMIN') LIMIT 1), 'owner@posumkm.com'),
  'PRO',
  true,
  99,
  999,
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM tenants LIMIT 1);

-- AlterTable: tambah tenantId dengan DEFAULT dulu agar data lama tidak error
ALTER TABLE "menu_permissions" ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "outlets"          ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pembelian"        ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "pengeluaran"      ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "products"         ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "sales_targets"    ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "shifts"           ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "suppliers"        ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "transactions"     ADD COLUMN "tenantId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users"            ADD COLUMN "tenantId" TEXT;

-- Isi semua baris dengan ID tenant yang baru dibuat
UPDATE "menu_permissions" SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "outlets"          SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "pembelian"        SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "pengeluaran"      SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "products"         SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "sales_targets"    SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "shifts"           SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "suppliers"        SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "transactions"     SET "tenantId" = (SELECT id FROM tenants LIMIT 1);
UPDATE "users"            SET "tenantId" = (SELECT id FROM tenants LIMIT 1);

-- Hapus DEFAULT setelah data terisi
ALTER TABLE "menu_permissions" ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "outlets"          ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "pembelian"        ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "pengeluaran"      ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "products"         ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "sales_targets"    ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "shifts"           ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "suppliers"        ALTER COLUMN "tenantId" DROP DEFAULT;
ALTER TABLE "transactions"     ALTER COLUMN "tenantId" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pengeluaran" ADD CONSTRAINT "pengeluaran_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales_targets" ADD CONSTRAINT "sales_targets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pembelian" ADD CONSTRAINT "pembelian_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "menu_permissions_menuKey_role_tenantId_key" ON "menu_permissions"("menuKey", "role", "tenantId");