'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';

export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'KASIR' | 'MANAGER';
  tenantId?: string | null;
  outletId?: string | null;
  outlet?: { id: string; nama: string; alamat?: string } | null;
}

export interface ActiveTenant {
  id: string;
  nama: string;
  plan?: string;
}

interface AuthState {
  user:            AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated:    boolean;

  // SUPERADMIN: tenant yang sedang aktif di-manage
  activeTenant: ActiveTenant | null;

  setHasHydrated: (state: boolean) => void;
  login:          (user: AuthUser) => void;
  logout:         () => void;
  switchOutlet:   (outlet: { id: string; nama: string }) => void;

  // SUPERADMIN: masuk ke konteks tenant tertentu
  enterTenant: (tenant: ActiveTenant) => void;
  // SUPERADMIN: keluar dari konteks tenant
  exitTenant:  () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      _hasHydrated:    false,
      activeTenant:    null,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      login: (user) => {
        if (user.tenantId) Cookies.set('x-tenant-id', user.tenantId, { expires: 7 });
        Cookies.set('x-user-role', user.role, { expires: 7 });
        if (user.id) Cookies.set('x-user-id', user.id, { expires: 7 });
        set({ user, isAuthenticated: true, activeTenant: null });
      },

      logout: () => {
        Cookies.remove('x-tenant-id');
        Cookies.remove('x-user-role');
        Cookies.remove('x-user-id');
        Cookies.remove('x-active-tenant-id');
        set({ user: null, isAuthenticated: false, activeTenant: null });
      },

      switchOutlet: (outlet) =>
        set((state) => ({
          user: state.user ? { ...state.user, outletId: outlet.id, outlet } : null,
        })),

      // SUPERADMIN masuk ke konteks tenant tertentu
      enterTenant: (tenant) => {
        Cookies.set('x-active-tenant-id', tenant.id, { expires: 1 });
        set({ activeTenant: tenant });
      },

      // SUPERADMIN keluar dari konteks tenant
      exitTenant: () => {
        Cookies.remove('x-active-tenant-id');
        set({ activeTenant: null });
      },
    }),
    {
      name: 'pos-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Restore cookie dari persisted activeTenant
        if (state?.activeTenant?.id) {
          Cookies.set('x-active-tenant-id', state.activeTenant.id, { expires: 1 });
        }
      },
    }
  )
);