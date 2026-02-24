/*
  Warnings:

  - Changed the type of `role` on the `menu_permissions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "menu_permissions" DROP CONSTRAINT "menu_permissions_tenantId_fkey";

-- AlterTable
ALTER TABLE "GajiSetting" ADD COLUMN     "gajiHarian" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skema" TEXT NOT NULL DEFAULT 'bulanan';

-- AlterTable
ALTER TABLE "menu_permissions" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "menu_permissions_tenantId_idx" ON "menu_permissions"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_permissions_menuKey_role_tenantId_key" ON "menu_permissions"("menuKey", "role", "tenantId");

-- AddForeignKey
ALTER TABLE "menu_permissions" ADD CONSTRAINT "menu_permissions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
