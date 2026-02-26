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

  activeTenant: ActiveTenant | null;

  setHasHydrated: (state: boolean) => void;
  login:          (user: AuthUser) => void;
  logout:         () => void;
  switchOutlet:   (outlet: { id: string; nama: string }) => void;
  enterTenant:    (tenant: ActiveTenant) => void;
  exitTenant:     () => void;
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
        if (user.tenantId) Cookies.set('x-tenant-id',  user.tenantId,  { expires: 7 });
        if (user.outletId) Cookies.set('x-outlet-id',  user.outletId,  { expires: 7 }); // ✅ simpan outletId
        Cookies.set('x-user-role', user.role, { expires: 7 });
        if (user.id)       Cookies.set('x-user-id',    user.id,        { expires: 7 });
        set({ user, isAuthenticated: true, activeTenant: null });
      },

      logout: () => {
        Cookies.remove('x-tenant-id');
        Cookies.remove('x-outlet-id');   // ✅ hapus outletId saat logout
        Cookies.remove('x-user-role');
        Cookies.remove('x-user-id');
        Cookies.remove('x-active-tenant-id');
        set({ user: null, isAuthenticated: false, activeTenant: null });
      },

      switchOutlet: (outlet) => {
        Cookies.set('x-outlet-id', outlet.id, { expires: 7 }); // ✅ update cookie saat ganti outlet
        set((state) => ({
          user: state.user ? { ...state.user, outletId: outlet.id, outlet } : null,
        }));
      },

      enterTenant: (tenant) => {
        Cookies.set('x-active-tenant-id', tenant.id, { expires: 1 });
        set({ activeTenant: tenant });
      },

      exitTenant: () => {
        Cookies.remove('x-active-tenant-id');
        set({ activeTenant: null });
      },
    }),
    {
      name: 'pos-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // ✅ Restore semua cookie dari persisted state
        if (state?.user?.tenantId) Cookies.set('x-tenant-id', state.user.tenantId, { expires: 7 });
        if (state?.user?.outletId) Cookies.set('x-outlet-id', state.user.outletId, { expires: 7 });
        if (state?.user?.role)     Cookies.set('x-user-role', state.user.role,     { expires: 7 });
        if (state?.user?.id)       Cookies.set('x-user-id',   state.user.id,       { expires: 7 });
        if (state?.activeTenant?.id) {
          Cookies.set('x-active-tenant-id', state.activeTenant.id, { expires: 1 });
        }
      },
    }
  )
);