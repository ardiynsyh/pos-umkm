'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import Link from 'next/link';
import { ShoppingCart, Package, BarChart3, Users, Settings, Wallet, ClipboardList, Store } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';

  const menuItems = [
    { href: '/kasir', title: 'Kasir', description: 'Transaksi penjualan dan pembayaran', icon: ShoppingCart, color: 'blue' },
    { href: '/produk', title: 'Produk', description: 'Kelola stok dan data produk', icon: Package, color: 'green' },
    { href: '/laporan', title: 'Laporan', description: 'Statistik dan laporan penjualan', icon: BarChart3, color: 'purple' },
  ];

  if (isSuperAdmin || isAdmin || isManager) {
    menuItems.push({
      href: '/kasir/pesanan',
      title: 'Pesanan',
      description: 'Kelola pesanan masuk dari customer',
      icon: ClipboardList,
      color: 'orange',
    });
  }

  if (isSuperAdmin || isAdmin) {
    menuItems.push(
      { href: '/pengeluaran', title: 'Pengeluaran', description: 'Catat dan kelola pengeluaran toko', icon: Wallet, color: 'red' },
      { href: '/users', title: 'User Management', description: 'Kelola user kasir dan akses', icon: Users, color: 'indigo' },
      { href: '/settings', title: 'Settings', description: 'Pengaturan aplikasi dan QR payment', icon: Settings, color: 'gray' },
    );
  }

  if (isSuperAdmin) {
    menuItems.push({
      href: '/outlets',
      title: 'Manajemen Outlet',
      description: 'Kelola semua cabang/outlet',
      icon: Store,
      color: 'teal',
    });
  }

  const colorClasses: Record<string, string> = {
    blue:   'bg-blue-100 group-hover:bg-blue-200 text-blue-600',
    green:  'bg-green-100 group-hover:bg-green-200 text-green-600',
    purple: 'bg-purple-100 group-hover:bg-purple-200 text-purple-600',
    orange: 'bg-orange-100 group-hover:bg-orange-200 text-orange-600',
    red:    'bg-red-100 group-hover:bg-red-200 text-red-600',
    indigo: 'bg-indigo-100 group-hover:bg-indigo-200 text-indigo-600',
    gray:   'bg-gray-100 group-hover:bg-gray-200 text-gray-600',
    teal:   'bg-teal-100 group-hover:bg-teal-200 text-teal-600',
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-1">
              Selamat Datang, {user?.nama}!
            </h1>
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                isSuperAdmin ? 'bg-purple-100 text-purple-700' :
                isAdmin ? 'bg-blue-100 text-blue-700' :
                isManager ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'
              }`}>{user?.role}</span>
              {user?.outlet && (
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5" />
                  {user.outlet.nama}
                </span>
              )}
            </div>
          </div>

          {/* Peringatan SUPERADMIN jika belum pilih outlet */}
          {isSuperAdmin && !user?.outletId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Store className="w-5 h-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Belum memilih outlet</p>
                <p className="text-xs text-yellow-600">Pilih outlet di navbar atas untuk melihat data per outlet, atau buka halaman <Link href="/outlets" className="underline font-medium">Manajemen Outlet</Link>.</p>
              </div>
            </div>
          )}

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer group">
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-4 rounded-full mb-4 transition-colors ${colorClasses[item.color]}`}>
                        <Icon className="w-10 h-10" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h2>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}