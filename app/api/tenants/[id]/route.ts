// app/api/tenants/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcrypt';

/**
 * Perbaikan utama: params sekarang adalah Promise di Next.js 15.
 * Kita harus mendefinisikan tipenya sebagai Promise dan melakukan await.
 */

// ── PUT /api/tenants/[id] ──────────────────────────────────────────────────
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Perubahan tipe di sini
) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Melakukan await params sebelum mengambil id
  const { id } = await params;

  try {
    const { nama, email, plan, maxOutlets, adminEmail, adminPassword } = await req.json();

    if (!nama?.trim()) {
      return NextResponse.json({ message: 'Nama tenant wajib diisi' }, { status: 400 });
    }
    if (adminPassword && adminPassword.length < 8) {
      return NextResponse.json({ message: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    if (email && email !== existing.email) {
      const duplicate = await prisma.tenant.findFirst({ where: { email, NOT: { id } } });
      if (duplicate) {
        return NextResponse.json({ message: 'Email bisnis sudah digunakan tenant lain' }, { status: 400 });
      }
    }

    if (adminEmail) {
      const existingUser = await prisma.user.findFirst({
        where: { email: adminEmail, NOT: { tenantId: id } },
      });
      if (existingUser) {
        return NextResponse.json({ message: 'Email admin sudah digunakan di toko lain' }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id },
        data: {
          nama: nama.trim(),
          email: email || null,
          ...(plan !== undefined && { plan }),
          ...(maxOutlets !== undefined && { maxOutlets: Number(maxOutlets) || 1 }),
        },
      });

      if (adminEmail || adminPassword) {
        const admin = await tx.user.findFirst({ where: { tenantId: id, role: 'ADMIN' } });
        if (admin) {
          await tx.user.update({
            where: { id: admin.id },
            data: {
              ...(adminEmail && { email: adminEmail }),
              ...(adminPassword && { password: await bcrypt.hash(adminPassword, 10) }),
            },
          });
        }
      }

      return tenant;
    });

    return NextResponse.json({ message: `Tenant "${result.nama}" berhasil diperbarui`, tenant: result });
  } catch (error) {
    console.error('[PUT /api/tenants/[id]]', error);
    return NextResponse.json({ error: 'Gagal memperbarui tenant' }, { status: 500 });
  }
}

// ── DELETE /api/tenants/[id] ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Perubahan tipe di sini
) {
  const role = req.headers.get('x-user-role');
  if (role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Melakukan await params sebelum mengambil id
  const { id } = await params;

  try {
    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ message: 'Tenant tidak ditemukan' }, { status: 404 });
    }

    // Ambil outletIds & userIds di luar transaksi
    const outletIds = (
      await prisma.outlet.findMany({ where: { tenantId: id }, select: { id: true } })
    ).map(o => o.id);

    const userIds = (
      await prisma.user.findMany({ where: { tenantId: id }, select: { id: true } })
    ).map(u => u.id);

    // ── 1. GajiSetting (FK → User)
    if (userIds.length > 0) {
      await prisma.gajiSetting.deleteMany({ where: { userId: { in: userIds } } });
    }

    // ── 2. Data karyawan & per-outlet records
    if (outletIds.length > 0) {
      await prisma.logAktivitas.deleteMany({ where: { outletId: { in: outletIds } } });
      await prisma.jadwal.deleteMany({ where: { outletId: { in: outletIds } } });
      await prisma.absensi.deleteMany({ where: { outletId: { in: outletIds } } });
      await prisma.payroll.deleteMany({ where: { outletId: { in: outletIds } } });
      await prisma.menuPermission.deleteMany({ where: { tenantId: { in: outletIds } } });
    }

    // ── 3. Shift & SalesTarget
    await prisma.shift.deleteMany({ where: { tenantId: id } });
    await prisma.salesTarget.deleteMany({ where: { tenantId: id } });

    // ── 4. Keuangan
    await prisma.pengeluaran.deleteMany({ where: { tenantId: id } });

    // ── 5. PembelianItem → Pembelian → Supplier
    await prisma.pembelianItem.deleteMany({ where: { pembelian: { tenantId: id } } });
    await prisma.pembelian.deleteMany({ where: { tenantId: id } });
    await prisma.supplier.deleteMany({ where: { tenantId: id } });

    // ── 6. OrderItem → Order → Table
    await prisma.orderItem.deleteMany({ where: { order: { tenantId: id } } });
    await prisma.order.deleteMany({ where: { tenantId: id } });
    await prisma.table.deleteMany({ where: { tenantId: id } });

    // ── 7. TransactionItem → Transaction
    await prisma.transactionItem.deleteMany({ where: { transaction: { tenantId: id } } });
    await prisma.transaction.deleteMany({ where: { tenantId: id } });

    // ── 8. Product
    await prisma.product.deleteMany({ where: { tenantId: id } });

    // ── 9. PaymentQR
    await prisma.paymentQR.deleteMany({ where: { tenantId: id } });

    // ── 10. Outlet
    await prisma.outlet.deleteMany({ where: { tenantId: id } });

    // ── 11. User
    await prisma.user.deleteMany({ where: { tenantId: id } });

    // ── 12. Tenant
    await prisma.tenant.delete({ where: { id } });

    return NextResponse.json({ message: `Tenant "${existing.nama}" berhasil dihapus` });
  } catch (error: any) {
    console.error('[DELETE /api/tenants/[id]]', error);
    return NextResponse.json({
      error: 'Gagal menghapus tenant',
      detail: error?.message ?? String(error),
    }, { status: 500 });
  }
}