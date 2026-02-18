'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/lib/db/database';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  login: (user: User) => void;
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
        // Dipanggil setelah Zustand selesai baca localStorage
        state?.setHasHydrated(true);
      },
    }
  )
);
