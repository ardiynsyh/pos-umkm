'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOwner?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireOwner = false,
}) => {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated } = useAuthStore();

  useEffect(() => {
    // Tunggu sampai Zustand selesai hydrate dari localStorage
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (requireOwner && user?.role !== 'owner') {
      router.push('/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, user, router, requireOwner]);

  // Tampilkan loading selama hydration atau belum authenticated
  if (!_hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (requireOwner && user?.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-medium">Akses ditolak. Anda tidak memiliki izin.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
