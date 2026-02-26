// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Route yang hanya bisa diakses ADMIN ke atas ───────────────────────────
const ADMIN_ONLY_ROUTES = ['/users', '/settings'];

// ─── Route ADMIN + MANAGER ─────────────────────────────────────────────────
const ADMIN_MANAGER_ROUTES = ['/keuangan', '/target-penjualan'];

// ─── Route operasional (KASIR + ADMIN bisa akses) ─────────────────────────
const KASIR_ONLY_ROUTES = ['/operasional'];

// ─── Route SUPERADMIN only ─────────────────────────────────────────────────
const SUPERADMIN_ONLY_ROUTES = ['/tenants', '/settings/menu-permissions'];

// ─── Route meja: ADMIN + SUPERADMIN only ──────────────────────────────────
const MEJA_ROUTES = ['/settings/meja'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root ke login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Skip static assets & API routes (API punya auth sendiri)
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    const requestHeaders = new Headers(request.headers);
    const tenantId       = request.cookies.get('x-tenant-id')?.value;
    const userRole       = request.cookies.get('x-user-role')?.value;
    const userId         = request.cookies.get('x-user-id')?.value;
    const activeTenantId = request.cookies.get('x-active-tenant-id')?.value;

    if (userRole)  requestHeaders.set('x-user-role', userRole);
    if (userId)    requestHeaders.set('x-user-id', userId);

    if (userRole === 'SUPERADMIN') {
      if (activeTenantId) {
        requestHeaders.set('x-tenant-id', activeTenantId);
        requestHeaders.set('x-is-managing-tenant', 'true');
      }
    } else if (tenantId) {
      requestHeaders.set('x-tenant-id', tenantId);
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const tenantId       = request.cookies.get('x-tenant-id')?.value;
  const userRole       = request.cookies.get('x-user-role')?.value;
  const userId         = request.cookies.get('x-user-id')?.value;
  const activeTenantId = request.cookies.get('x-active-tenant-id')?.value;

  // Kalau belum login & bukan halaman publik → redirect ke login
  const publicPaths = ['/login', '/register'];
  if (!userRole && !publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const requestHeaders = new Headers(request.headers);
  if (userRole)  requestHeaders.set('x-user-role', userRole);
  if (userId)    requestHeaders.set('x-user-id', userId);

  if (userRole === 'SUPERADMIN') {
    if (activeTenantId) {
      requestHeaders.set('x-tenant-id', activeTenantId);
      requestHeaders.set('x-is-managing-tenant', 'true');
    }
  } else if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId);
  }

  // ── Proteksi SUPERADMIN only ───────────────────────────────────────────────
  if (SUPERADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    if (userRole !== 'SUPERADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Proteksi ADMIN only ────────────────────────────────────────────────────
  if (ADMIN_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Proteksi ADMIN + MANAGER ───────────────────────────────────────────────
  if (ADMIN_MANAGER_ROUTES.some(r => pathname.startsWith(r))) {
    if (!['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(userRole ?? '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Proteksi Meja: hanya ADMIN & SUPERADMIN ────────────────────────────────
  if (MEJA_ROUTES.some(r => pathname.startsWith(r))) {
    if (userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Proteksi Operasional: ADMIN + KASIR ───────────────────────────────────
  if (KASIR_ONLY_ROUTES.some(r => pathname.startsWith(r))) {
    if (!['KASIR', 'SUPERADMIN', 'ADMIN'].includes(userRole ?? '')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};