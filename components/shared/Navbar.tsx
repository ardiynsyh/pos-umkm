'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui';
import {
  Home, LogOut, User, Settings, ShoppingCart,
  Package, BarChart3, Users, ClipboardList, Bell
} from 'lucide-react';
import { useState } from 'react';

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  // Nonaktifkan hook notifikasi sementara
  const unreadCount = 0;
  const newOrders: any[] = [];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/kasir', label: 'Kasir', icon: ShoppingCart },
    { href: '/produk', label: 'Produk', icon: Package },
    { href: '/laporan', label: 'Laporan', icon: BarChart3 },
  ];

  // Menu khusus ADMIN dan MANAGER
  if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
    navItems.push(
      { href: '/pesanan', label: 'Pesanan', icon: ClipboardList },
    );
  }

  // Menu khusus ADMIN
  if (user?.role === 'ADMIN') {
    navItems.push(
      { href: '/users', label: 'Users', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings },
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-800">POS UMKM</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Notifikasi Bell - Nonaktifkan sementara */}
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER') && (
              <div className="relative">
                <button
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Dropdown Notifikasi - Sederhana dulu */}
                {showNotificationDropdown && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
                    <div className="p-3 border-b">
                      <h3 className="font-semibold">Pesanan Baru</h3>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                      {newOrders.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          Tidak ada pesanan baru
                        </div>
                      ) : (
                        newOrders.map((order) => (
                          <div key={order.id} className="p-3 hover:bg-gray-50 border-b">
                            <p className="text-sm font-medium">#{order.orderNumber}</p>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="p-2 border-t">
                      <Link
                        href="/pesanan"
                        className="block text-center text-sm text-blue-600 hover:text-blue-800 py-1"
                        onClick={() => setShowNotificationDropdown(false)}
                      >
                        Lihat semua pesanan
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Info */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800">{user?.nama}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>

            {/* Logout Button */}
            <Button variant="outline" size="sm" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t">
        <div className="flex overflow-x-auto py-2 px-4 gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg whitespace-nowrap relative ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{item.label}</span>
                {item.href === '/pesanan' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};