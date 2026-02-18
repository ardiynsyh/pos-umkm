'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui';
import {
  Home,
  LogOut,
  User,
  Settings,
  ShoppingCart,
  Package,
  BarChart3,
  Users,
} from 'lucide-react';

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

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

  // Add owner-only menu items
  if (user?.role === 'owner') {
    navItems.push(
      { href: '/users', label: 'User Management', icon: Users },
      { href: '/settings', label: 'Settings', icon: Settings }
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
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
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
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
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};