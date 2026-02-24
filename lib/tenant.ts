// lib/tenant.ts
// Helper untuk mengambil tenantId dari berbagai sumber

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Ambil tenantId dari header request (di-inject oleh middleware)
 */
export function getTenantIdFromRequest(req: NextRequest): string | null {
  return req.headers.get('x-tenant-id');
}

/**
 * Ambil tenant lengkap berdasarkan slug
 */
export async function getTenantBySlug(slug: string) {
  return prisma.tenant.findUnique({
    where: { slug },
    include: { outlets: true },
  });
}

/**
 * Validasi apakah tenantId valid dan aktif
 */
export async function validateTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId, isActive: true },
  });
  return tenant;
}

/**
 * Cek limit plan tenant
 */
export async function checkTenantLimits(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { outlets: true, users: true } },
    },
  });
  if (!tenant) return null;
  return {
    canAddOutlet: tenant._count.outlets < tenant.maxOutlets,
    canAddUser:   tenant._count.users   < tenant.maxUsers,
    outletCount:  tenant._count.outlets,
    userCount:    tenant._count.users,
    maxOutlets:   tenant.maxOutlets,
    maxUsers:     tenant.maxUsers,
    plan:         tenant.plan,
  };
}

/**
 * Buat slug unik dari nama tenant
 */
export function createSlug(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}