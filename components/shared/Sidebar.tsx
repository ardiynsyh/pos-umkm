'use client';

// components/shared/Sidebar.tsx
// Sidebar navigasi kiri – collapsible di mobile, fixed di desktop    

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Home, LogOut, Settings, ShoppingCart, Package,
  BarChart3, Users, ClipboardList, Store, ChevronDown,
  Shield, Menu, X, ChevronLeft, ChevronRight,
  Truck, ShoppingBag, Target, Wallet,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const ALL_NAV_ITEMS = [
  { key: 'dashboard',        href: '/dashboard',                 label: 'Dashboard',       icon: Home,          roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'kasir',            href: '/kasir',                     label: 'Kasir',           icon: ShoppingCart,  roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'produk',           href: '/produk',                    label: 'Produk',          icon: Package,       roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'laporan',          href: '/laporan',                   label: 'Laporan',         icon: BarChart3,     roles: ['SUPERADMIN','ADMIN','MANAGER','KASIR'] },
  { key: 'pesanan',          href: '/kasir/pesanan',             label: 'Pesanan',         icon: ClipboardList, roles: ['SUPERADMIN','ADMIN','MANAGER'] },
  { key: 'pengeluaran',      href: '/pengeluaran',               label: 'Pengeluaran',     icon: Wallet,        roles: ['SUPERADMIN','ADMIN'] },
  { key: 'supplier',         href: '/supplier',                  label: 'Supplier',        icon: Truck,         roles: ['SUPERADMIN','ADMIN'] },
  { key: 'pembelian',        href: '/pembelian',                 label: 'Pembelian',       icon: ShoppingBag,   roles: ['SUPERADMIN','ADMIN'] },
  { key: 'target-penjualan', href: '/target-penjualan',         label: 'Target',          icon: Target,        roles: ['SUPERADMIN','ADMIN','MANAGER'] },
  { key: 'users',            href: '/users',                     label: 'Users',           icon: Users,         roles: ['SUPERADMIN','ADMIN'] },
  { key: 'settings',         href: '/settings',                  label: 'Settings',        icon: Settings,      roles: ['SUPERADMIN','ADMIN'] },
  { key: 'outlets',          href: '/outlets',                   label: 'Outlets',         icon: Store,         roles: ['SUPERADMIN'] },
  { key: 'menu-permissions', href: '/settings/menu-permissions', label: 'Akses Menu',      icon: Shield,        roles: ['SUPERADMIN'] },
];

export const Sidebar = () => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout, switchOutlet } = useAuthStore();

  const [outlets,            setOutlets]            = useState<{ id: string; nama: string }[]>([]);
  const [showOutletDropdown, setShowOutletDropdown] = useState(false);
  const [menuPermissions,    setMenuPermissions]    = useState<Record<string, boolean>>({});
  const [permissionsLoaded,  setPermissionsLoaded]  = useState(false);
  const [collapsed,          setCollapsed]          = useState(false);
  const [mobileOpen,         setMobileOpen]         = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin      = user?.role === 'ADMIN';

  useEffect(() => {
    if (isSuperAdmin) {
      fetch('/api/outlets').then(r => r.json()).then(d => setOutlets(d.outlets ?? [])).catch(() => {});
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!user || isSuperAdmin) { setPermissionsLoaded(true); return; }
    fetch('/api/menu-permissions')
      .then(r => r.json())
      .then(d => setMenuPermissions(d.permissions?.[user.role] ?? {}))
      .catch(() => {})
      .finally(() => setPermissionsLoaded(true));
  }, [user, isSuperAdmin]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const navItems = ALL_NAV_ITEMS.filter(item => {
    if (!item.roles.includes(user?.role ?? '')) return false;
    if (isSuperAdmin) return true;
    if (item.key === 'dashboard') return true;
    if (!permissionsLoaded) return true;
    const permitted = menuPermissions[item.key];
    return permitted === undefined ? true : permitted;
  });

  const handleLogout = () => { logout(); router.push('/login'); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">

      {/* Logo + collapse toggle */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-800 whitespace-nowrap">POS UMKM</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard">
            <div className="bg-blue-600 p-2 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(item => {
          const Icon     = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.key}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Outlet switcher (SUPERADMIN) */}
      {isSuperAdmin && !collapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <button
              onClick={() => setShowOutletDropdown(!showOutletDropdown)}
              className="w-full flex items-center gap-2 text-sm bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Store className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 text-left truncate text-xs font-medium">
                {user?.outlet?.nama ?? 'Pilih Outlet'}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>
            {showOutletDropdown && (
              <div className="absolute bottom-10 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                {outlets.map(o => (
                  <button key={o.id}
                    onClick={() => { switchOutlet(o); setShowOutletDropdown(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${user?.outletId === o.id ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                  >
                    {o.nama}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* User info + logout */}
      <div className={`p-3 border-t border-gray-100 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
              isSuperAdmin ? 'bg-purple-500' : isAdmin ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              {user?.nama?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-none truncate">{user?.nama}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Logout"
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-100 shadow-sm transition-all duration-300 flex-shrink-0 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`} style={{ height: '100vh', position: 'sticky', top: 0 }}>
        <SidebarContent />
      </aside>

      {/* Mobile: top bar + drawer */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm h-14 flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-gray-800">POS UMKM</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
              isSuperAdmin ? 'bg-purple-500' : isAdmin ? 'bg-blue-500' : 'bg-gray-400'
            }`}>
              {user?.nama?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
        )}

        <aside className={`fixed top-0 left-0 bottom-0 z-50 w-[260px] bg-white shadow-xl transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <SidebarContent />
        </aside>
      </div>
    </>
  );
};