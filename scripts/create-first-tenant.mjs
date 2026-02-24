import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findFirst({
    where: { role: { in: ["SUPERADMIN", "ADMIN"] } },
    select: { email: true, nama: true }
  });
  console.log("User ditemukan:", user?.nama, user?.email);
  const tenant = await prisma.tenant.create({
    data: {
      nama: "Toko Pusat Ardiyansyah",
      slug: "toko-pusat-ardiyansyah",
      email: user?.email ?? "owner@posumkm.com",
      plan: "PRO",
      maxOutlets: 99,
      maxUsers: 999,
      isActive: true,
    },
  });
  console.log("\n✅ Tenant berhasil dibuat!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("ID  :", tenant.id);
  console.log("Nama:", tenant.nama);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚡ Copy ID di atas, paste ke migration.sql");
}
main()
  .catch(e => { console.error("❌ Error:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());