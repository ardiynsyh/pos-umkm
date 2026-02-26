'use client';
// app/(dashboard)/karyawan/layout.tsx
// Layout shared untuk semua halaman karyawan — tab navigasi

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ClipboardCheck, CalendarDays, BadgeDollarSign } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import type { ReactNode } from 'react';

export default function KaryawanLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isKasir  = user?.role === 'KASIR';

  const TABS = [
    { href: '/karyawan/absensi', label: 'Absensi', icon: ClipboardCheck },
    { href: '/karyawan/jadwal',  label: 'Jadwal',  icon: CalendarDays },
    ...(!isKasir ? [{ href: '/karyawan/payroll', label: 'Payroll', icon: BadgeDollarSign }] : []),
  ];

  return (
    <div className="space-y-4">
      {/* Tab header */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        {TABS.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
