'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
  requireSuperAdmin?: boolean;
  // ✅ Prop baru: tentukan role mana saja yang boleh akses halaman ini
  // Jika tidak diisi → semua role yang sudah login boleh akses
  allowedRoles?: ('SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'KASIR')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOwner      = false,
  requireSuperAdmin = false,
  allowedRoles,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  const isSuperAdmin        = user?.role === 'SUPERADMIN';
  const isAdmin             = user?.role === 'ADMIN';
  const hasOwnerAccess      = isSuperAdmin || isAdmin;
  const hasSuperAdminAccess = isSuperAdmin;

  // ✅ Cek allowedRoles jika diisi
  const hasRoleAccess = allowedRoles
    ? (user?.role ? allowedRoles.includes(user.role as any) : false)
    : true;

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requireSuperAdmin && !hasSuperAdminAccess) {
      router.push('/dashboard');
      return;
    }

    if (requireOwner && !hasOwnerAccess) {
      router.push('/dashboard');
      return;
    }

    // ✅ Cek allowedRoles
    if (allowedRoles && !hasRoleAccess) {
      router.push('/dashboard');
      return;
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hasHydrated, isAuthenticated, hasSuperAdminAccess, hasOwnerAccess, hasRoleAccess]);

  // Belum rehidrasi atau belum login → tampilkan loading
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (requireSuperAdmin && !hasSuperAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Akses ditolak. Hanya SuperAdmin yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  if (requireOwner && !hasOwnerAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Akses ditolak. Anda tidak memiliki izin.</p>
        </div>
      </div>
    );
  }

  if (allowedRoles && !hasRoleAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Akses ditolak. Anda tidak memiliki izin untuk halaman ini.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};