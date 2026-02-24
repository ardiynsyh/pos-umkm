import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const OWNER_ONLY_ROUTES = ['/pengeluaran', '/users', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root ke login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const tenantId       = request.cookies.get('x-tenant-id')?.value;
  const userRole       = request.cookies.get('x-user-role')?.value;
  const userId         = request.cookies.get('x-user-id')?.value;
  // Tenant yang sedang aktif di-manage oleh SUPERADMIN
  const activeTenantId = request.cookies.get('x-active-tenant-id')?.value;

  const requestHeaders = new Headers(request.headers);

  // Inject role & userId selalu
  if (userRole)  requestHeaders.set('x-user-role', userRole);
  if (userId)    requestHeaders.set('x-user-id', userId);

  // Inject tenant-id:
  // Jika SUPERADMIN sedang "masuk" ke tenant tertentu → pakai activeTenantId
  // Jika SUPERADMIN tanpa active tenant → tidak inject (API handle sendiri)
  // Jika role lain → pakai tenantId milik user itu sendiri
  if (userRole === 'SUPERADMIN') {
    if (activeTenantId) {
      // SUPERADMIN sedang mengelola tenant tertentu
      requestHeaders.set('x-tenant-id', activeTenantId);
      requestHeaders.set('x-is-managing-tenant', 'true');
    }
    // Jika tidak ada activeTenantId → biarkan header kosong,
    // API akan tahu ini SUPERADMIN global
  } else if (tenantId) {
    requestHeaders.set('x-tenant-id', tenantId);
  }

  // Proteksi owner-only routes
  const isOwnerRoute = OWNER_ONLY_ROUTES.some(route => pathname.startsWith(route));
  if (isOwnerRoute && userRole !== 'SUPERADMIN' && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect SUPERADMIN tanpa activeTenant ke halaman tenants
  // kecuali sudah di halaman superadmin atau login
  const superAdminOnlyPaths = ['/tenants', '/login', '/api'];
  const isAllowedWithoutTenant = superAdminOnlyPaths.some(p => pathname.startsWith(p));

  if (
    userRole === 'SUPERADMIN' &&
    !activeTenantId &&
    !isAllowedWithoutTenant &&
    pathname !== '/dashboard'
  ) {
    // Biarkan SUPERADMIN global akses dashboard & tenants
    // Untuk route lain, tetap izinkan tapi API akan handle data global
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
