// app/(dashboard)/layout.tsx
// Layout dashboard dengan sidebar kiri

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/shared/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Konten utama */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Spacer untuk mobile top bar */}
        <div className="lg:hidden h-14 flex-shrink-0" />
        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
