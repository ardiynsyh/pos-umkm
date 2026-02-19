-- Tambah kolom outletId dengan nilai sementara (nullable dulu)
ALTER TABLE "Table" ADD COLUMN "outletId" TEXT;

-- Isi outletId dari outlet pertama yang ada (untuk data existing)
UPDATE "Table" SET "outletId" = (SELECT id FROM "outlets" LIMIT 1);

-- Baru jadikan NOT NULL setelah terisi semua
ALTER TABLE "Table" ALTER COLUMN "outletId" SET NOT NULL;

-- Tambah foreign key constraint
ALTER TABLE "Table" ADD CONSTRAINT "Table_outletId_fkey" 
  FOREIGN KEY ("outletId") REFERENCES "outlets"("id") 
  ON DELETE RESTRICT ON UPDATE CASCADE;