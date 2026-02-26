-- AlterTable
ALTER TABLE "pengeluaran" ADD COLUMN     "pembelianId" TEXT,
ADD COLUMN     "sumber" TEXT NOT NULL DEFAULT 'manual';
