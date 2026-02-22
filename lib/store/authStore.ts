'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'KASIR' | 'MANAGER';
  outletId?: string | null;
  outlet?: { id: string; nama: string; alamat?: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
  switchOutlet: (outlet: { id: string; nama: string }) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
      switchOutlet: (outlet) =>
        set((state) => ({
          user: state.user ? { ...state.user, outletId: outlet.id, outlet } : null,
        })),
    }),
    {
      name: 'pos-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);