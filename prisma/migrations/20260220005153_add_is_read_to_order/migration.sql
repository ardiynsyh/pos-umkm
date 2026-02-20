-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "paymentQR" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paymentQR_pkey" PRIMARY KEY ("id")
);
