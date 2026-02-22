'use client';

// components/Navbar.tsx — versi update dengan dukungan menu permissions

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui';
import {
  Home, LogOut, Settings, ShoppingCart,
  Package, BarChart3, Users, ClipboardList, Store,
  ChevronDown, Shield,
} from 'lucide-react';
import { useState, useEffect } from 'react';

// Semua menu yang mungkin tampil di navbar
const ALL_NAV_ITEMS = [
  { key: 'dashboard', href: '/dashboard',      label: 'Dashboard', icon: Home,          roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'kasir',     href: '/kasir',           label: 'Kasir',     icon: ShoppingCart,  roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'produk',    href: '/produk',          label: 'Produk',    icon: Package,       roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'laporan',   href: '/laporan',         label: 'Laporan',   icon: BarChart3,     roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'pesanan',   href: '/kasir/pesanan',   label: 'Pesanan',   icon: ClipboardList, roles: ['SUPERADMIN','ADMIN','MANAGER'] },
  { key: 'users',     href: '/users',           label: 'Users',     icon: Users,         roles: ['SUPERADMIN','ADMIN'] },
  { key: 'settings',  href: '/settings',        label: 'Settings',  icon: Settings,      roles: ['SUPERADMIN','ADMIN'] },
  { key: 'outlets',   href: '/outlets',         label: 'Outlets',   icon: Store,         roles: ['SUPERADMIN'] },
  // Menu khusus SUPERADMIN: kelola akses menu
  { key: 'menu-permissions', href: '/settings/menu-permissions', label: 'Akses Menu', icon: Shield, roles: ['SUPERADMIN'] },
];

export const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, switchOutlet } = useAuthStore();
  const [outlets, setOutlets] = useState<{ id: string; nama: string }[]>([]);
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);

  // State untuk menyimpan permissions dari server
  const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>({});
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin = user?.role === 'ADMIN';

  // ─── Load outlet list untuk SUPERADMIN ─────────────────────────────────────
  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/outlets')
        .then((r) => r.json())
        .then((d) => setOutlets(d.outlets ?? []))
        .catch(() => {});
    }
  }, [isSuperAdmin]);

  // ─── Load menu permissions dari API ────────────────────────────────────────
  // Hanya diperlukan untuk role non-SUPERADMIN (SUPERADMIN selalu penuh)
  useEffect(() => {
    if (!user || isSuperAdmin) {
      setPermissionsLoaded(true);
      return;
    }

    fetch('/api/menu-permissions')
      .then((r) => r.json())
      .then((d) => {
        const permsForRole: Record<string, boolean> = d.permissions?.[user.role] ?? {};
        setMenuPermissions(permsForRole);
      })
      .catch(() => {
        // Jika gagal fetch, biarkan semua menu tampil (fail-open)
      })
      .finally(() => setPermissionsLoaded(true));
  }, [user, isSuperAdmin]);

  // ─── Filter nav items ──────────────────────────────────────────────────────
  const navItems = ALL_NAV_ITEMS.filter((item) => {
    const userRole = user?.role ?? '';

    // 1. Cek role dasar: apakah role user boleh lihat menu ini secara default
    if (!item.roles.includes(userRole)) return false;

    // 2. SUPERADMIN selalu lihat semua menu yang memang untuk SUPERADMIN
    if (isSuperAdmin) return true;

    // 3. Dashboard tidak bisa dinon-aktifkan
    if (item.key === 'dashboard') return true;

    // 4. Cek permission dari DB; default true jika tidak ada record
    if (!permissionsLoaded) return true; // belum load, tampilkan dulu
    const permitted = menuPermissions[item.key];
    return permitted === undefined ? true : permitted;
  });

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-3">

            {/* Outlet switcher untuk SUPERADMIN */}
            {isSuperAdmin && (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setShowOutletDropdown(!showOutletDropdown)}
                  className="flex items-center gap-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span className="max-w-[120px] truncate">{user?.outlet?.nama ?? 'Pilih Outlet'}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showOutletDropdown && (
                  <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[180px] py-1">
                    {outlets.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => { switchOutlet(o); setShowOutletDropdown(false); }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                          user?.outletId === o.id ? 'text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        {o.nama}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* User info */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                  isSuperAdmin ? 'bg-purple-500' : isAdmin ? 'bg-blue-500' : 'bg-gray-400'
                }`}
              >
                {user?.nama?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-gray-800 leading-none">{user?.nama}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
            </div>

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
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg whitespace-nowrap ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600'
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