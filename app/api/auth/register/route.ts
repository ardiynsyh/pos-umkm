// app/api/auth/register/route.ts
// Registrasi tenant baru + owner pertama

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSlug } from '@/lib/tenant';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { namaTenant, namaOwner, email, password, phone } = body;

    // ── Validasi input ──────────────────────────────────────────────────────
    if (!namaTenant || !namaOwner || !email || !password) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password minimal 8 karakter' },
        { status: 400 }
      );
    }

    // ── Cek email sudah terdaftar ───────────────────────────────────────────
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email sudah terdaftar' },
        { status: 400 }
      );
    }

    // ── Buat slug unik ──────────────────────────────────────────────────────
    let slug = createSlug(namaTenant);
    const existingSlug = await prisma.tenant.findUnique({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // ── Hash password ───────────────────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 12);

    // ── Buat tenant + outlet default + user owner dalam 1 transaction ───────
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat tenant
      const tenant = await tx.tenant.create({
        data: {
          nama: namaTenant,
          slug,
          email,
          phone: phone ?? null,
          plan: 'FREE',
          maxOutlets: 1,
          maxUsers: 3,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 hari trial
        },
      });

      // 2. Buat outlet pertama (default)
      const outlet = await tx.outlet.create({
        data: {
          nama: namaTenant,
          tenantId: tenant.id,
        },
      });

      // 3. Buat user owner (role ADMIN)
      const user = await tx.user.create({
        data: {
          nama: namaOwner,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          tenantId: tenant.id,
          outletId: outlet.id,
        },
        select: {
          id: true, nama: true, email: true, role: true,
          tenantId: true, outletId: true,
        },
      });

      return { tenant, outlet, user };
    });

    return NextResponse.json({
      message: 'Registrasi berhasil! Silakan login.',
      tenant: { id: result.tenant.id, nama: result.tenant.nama, slug: result.tenant.slug },
      user: result.user,
    });

  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json(
      { error: 'Gagal mendaftar. Coba lagi.' },
      { status: 500 }
    );
  }
}