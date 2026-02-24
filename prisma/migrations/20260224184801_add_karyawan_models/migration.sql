-- CreateTable
CREATE TABLE "Absensi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "jamMasuk" TEXT,
    "jamKeluar" TEXT,
    "shift" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Absensi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jadwal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAktivitas" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "meta" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogAktivitas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payroll" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GajiSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gajiPokok" INTEGER NOT NULL DEFAULT 0,
    "tunjangan" INTEGER NOT NULL DEFAULT 0,
    "tarifLembur" INTEGER NOT NULL DEFAULT 0,
    "potonganTerlambat" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GajiSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Absensi_tanggal_idx" ON "Absensi"("tanggal");

-- CreateIndex
CREATE INDEX "Absensi_outletId_idx" ON "Absensi"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Absensi_userId_tanggal_key" ON "Absensi"("userId", "tanggal");

-- CreateIndex
CREATE INDEX "Jadwal_tanggal_idx" ON "Jadwal"("tanggal");

-- CreateIndex
CREATE INDEX "Jadwal_outletId_idx" ON "Jadwal"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Jadwal_userId_tanggal_key" ON "Jadwal"("userId", "tanggal");

-- CreateIndex
CREATE INDEX "LogAktivitas_userId_idx" ON "LogAktivitas"("userId");

-- CreateIndex
CREATE INDEX "LogAktivitas_outletId_idx" ON "LogAktivitas"("outletId");

-- CreateIndex
CREATE INDEX "LogAktivitas_type_idx" ON "LogAktivitas"("type");

-- CreateIndex
CREATE INDEX "LogAktivitas_createdAt_idx" ON "LogAktivitas"("createdAt");

-- CreateIndex
CREATE INDEX "Payroll_periode_idx" ON "Payroll"("periode");

-- CreateIndex
CREATE INDEX "Payroll_outletId_idx" ON "Payroll"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "Payroll_userId_periode_key" ON "Payroll"("userId", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "GajiSetting_userId_key" ON "GajiSetting"("userId");

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absensi" ADD CONSTRAINT "Absensi_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jadwal" ADD CONSTRAINT "Jadwal_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogAktivitas" ADD CONSTRAINT "LogAktivitas_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payroll" ADD CONSTRAINT "Payroll_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GajiSetting" ADD CONSTRAINT "GajiSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
