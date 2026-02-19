'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Type sesuai Prisma schema (bukan Dexie)
export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  role: 'ADMIN' | 'KASIR' | 'MANAGER';
  outletId?: string | null;
  outlet?: { id: string; nama: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: AuthUser) => void;
  logout: () => void;
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
    }),
    {
      name: 'pos-auth-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);