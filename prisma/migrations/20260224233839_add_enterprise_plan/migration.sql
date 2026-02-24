-- AlterEnum
ALTER TYPE "Plan" ADD VALUE 'ENTERPRISE';

-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "email" DROP NOT NULL;
