'use client';
// app/(dashboard)/keuangan/layout.tsx
// Layout shared untuk semua halaman keuangan — menampilkan tab navigasi

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Wallet, Truck, Package } from 'lucide-react';
import type { ReactNode } from 'react';

const TABS = [
  { href: '/keuangan/laporan',     label: 'Laporan',     icon: BarChart3 },
  { href: '/keuangan/pengeluaran', label: 'Pengeluaran', icon: Wallet },
  { href: '/keuangan/supplier',    label: 'Supplier',    icon: Truck },
];

export default function KeuanganLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-4">
      {/* Tab header */}
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 overflow-x-auto">
        {TABS.map(t => {
          const active = pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link key={t.href} href={t.href}
              className={`flex items-center gap-2 flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
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
