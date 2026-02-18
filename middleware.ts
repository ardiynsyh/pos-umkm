import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Route yang hanya bisa diakses owner
const OWNER_ONLY_ROUTES = ['/pengeluaran', '/users', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect root to login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Proteksi route owner-only
  // Auth check di client side sudah ditangani ProtectedRoute + useAuthStore
  // Middleware ini sebagai lapisan tambahan — block akses langsung via URL
  const isOwnerRoute = OWNER_ONLY_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  if (isOwnerRoute) {
    // Cek cookie/session jika ada implementasi server-side auth
    // Saat ini proteksi utama ada di komponen ProtectedRoute + redirect di page
    // Tambahkan logika token/cookie di sini jika menggunakan server auth
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
