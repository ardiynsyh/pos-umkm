'use client';
// components/TenantBanner.tsx
// Banner yang muncul saat SUPERADMIN sedang mengelola tenant tertentu

import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { Crown, LogOut, Building2 } from 'lucide-react';

export function TenantBanner() {
  const { user, activeTenant, exitTenant } = useAuthStore();
  const router = useRouter();

  // Hanya tampil jika SUPERADMIN sedang di dalam tenant
  if (user?.role !== 'SUPERADMIN' || !activeTenant) return null;

  const handleExit = () => {
    exitTenant();
    router.push('/tenants');
  };

  return (
    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm">
        <Crown className="w-4 h-4 flex-shrink-0" />
        <span className="font-medium">Mode Superadmin</span>
        <span className="opacity-75">—</span>
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <span>Mengelola tenant: <strong>{activeTenant.nama}</strong></span>
        {activeTenant.plan && (
          <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-medium">
            {activeTenant.plan}
          </span>
        )}
      </div>
      <button
        onClick={handleExit}
        className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" />
        Keluar dari Tenant
      </button>
    </div>
  );
}