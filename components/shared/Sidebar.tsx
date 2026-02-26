'use client';

// components/shared/Sidebar.tsx
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Home, LogOut, ShoppingCart, Package, BarChart3,
  Users, Store, ChevronDown, Shield, Menu, X,
  ChevronLeft, ChevronRight, Target, Wallet,
  CalendarDays, ClipboardCheck, BadgeDollarSign,
  Building2, Crown, TrendingUp, UserCheck, Settings, Truck,
  QrCode,
} from 'lucide-react';
import { useState, useEffect } from 'react';

type NavItem = {
  key:   string;
  href:  string;
  label: string;
  icon:  any;
  roles: string[];
};

type NavGroup = {
  key:      string;
  label:    string;
  icon:     any;
  roles:    string[];
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const isGroup = (e: NavEntry): e is NavGroup => 'children' in e;

const NAV: NavEntry[] = [
  // ── Utama
  {
    key: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: Home,
    roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'],
  },

  // ── Operasional: ADMIN + KASIR
  {
    key: 'operasional', href: '/operasional', label: 'Operasional', icon: ShoppingCart,
    roles: ['ADMIN', 'KASIR'],
  },

  // ── Keuangan: dropdown
  {
    key: 'keuangan', label: 'Keuangan', icon: TrendingUp,
    roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'], // ✅ KASIR bisa lihat laporan
    children: [
      // ✅ KASIR hanya bisa lihat laporan (read-only, export only — dikontrol di halaman)
      {
        key: 'laporan', href: '/keuangan/laporan', label: 'Laporan', icon: BarChart3,
        roles: ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'],
      },
      {
        key: 'pengeluaran', href: '/keuangan/pengeluaran', label: 'Pengeluaran', icon: Wallet,
        roles: ['ADMIN', 'MANAGER'],
      },
      {
        key: 'supplier', href: '/keuangan/supplier', label: 'Supplier', icon: Truck,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },

  // ── Target
  {
    key: 'target-penjualan', href: '/target-penjualan', label: 'Target Penjualan', icon: Target,
    roles: ['ADMIN', 'MANAGER'],
  },

  // ── Karyawan: dropdown
  {
    key: 'karyawan', label: 'Karyawan', icon: UserCheck,
    roles: ['ADMIN', 'MANAGER', 'KASIR'],
    children: [
      {
        key: 'absensi', href: '/karyawan/absensi', label: 'Absensi', icon: ClipboardCheck,
        roles: ['ADMIN', 'MANAGER', 'KASIR'],
      },
      {
        key: 'jadwal', href: '/karyawan/jadwal', label: 'Jadwal', icon: CalendarDays,
        roles: ['ADMIN', 'MANAGER', 'KASIR'],
      },
      {
        key: 'payroll', href: '/karyawan/payroll', label: 'Payroll', icon: BadgeDollarSign,
        roles: ['ADMIN', 'MANAGER'],
      },
    ],
  },

  // ── Manajemen
  { key: 'users',    href: '/users',    label: 'Users',         icon: Users,    roles: ['ADMIN'] },
  {
    key: 'settings', label: 'Settings Toko', icon: Settings,
    roles: ['ADMIN'],
    children: [
      {
        key: 'settings-main', href: '/settings', label: 'Pengaturan Umum', icon: Settings,
        roles: ['ADMIN'],
      },
      // ✅ Meja hanya untuk ADMIN — KASIR tidak boleh
      {
        key: 'settings-meja', href: '/settings/meja', label: 'Meja & QR', icon: QrCode,
        roles: ['ADMIN'],
      },
    ],
  },

  // ── Superadmin only
  {
    key: 'tenants', href: '/tenants', label: 'Semua Tenant', icon: Building2,
    roles: ['SUPERADMIN'],
  },
  {
    key: 'menu-permissions', href: '/settings/menu-permissions', label: 'Akses Menu', icon: Shield,
    roles: ['SUPERADMIN'],
  },
];

function isActive(href: string, pathname: string) {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(href + '/');
}

export const Sidebar = () => {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, logout, activeTenant } = useAuthStore();

  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [perms,      setPerms]      = useState<Record<string, boolean>>({});
  const [permLoaded, setPermLoaded] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin      = user?.role === 'ADMIN';
  const isManager    = user?.role === 'MANAGER';
  const isKasir      = user?.role === 'KASIR';

  // Auto-expand grup yang ada child aktif
  useEffect(() => {
    const open = new Set<string>();
    NAV.forEach(e => {
      if (isGroup(e) && e.children.some(c => isActive(c.href, pathname))) open.add(e.key);
    });
    setOpenGroups(open);
  }, [pathname]);

  useEffect(() => {
    if (!user || isSuperAdmin) { setPermLoaded(true); return; }
    fetch('/api/menu-permissions')
      .then(r => r.json())
      .then(d => setPerms(d.permissions?.[user.role] ?? {}))
      .catch(() => {})
      .finally(() => setPermLoaded(true));
  }, [user, isSuperAdmin]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const canShow = (roles: string[], key: string) => {
    if (!roles.includes(user?.role ?? '')) return false;
    if (isSuperAdmin) return true;
    // Menu inti yang selalu tampil tanpa perlu cek permission DB
    const alwaysVisible = ['dashboard', 'operasional'];
    if (alwaysVisible.includes(key)) return true;
    if (!permLoaded) return true;
    return perms[key] === undefined ? true : perms[key];
  };

  const toggleGroup = (key: string) => {
    if (collapsed) { setCollapsed(false); return; }
    setOpenGroups(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const avatarBg =
    isSuperAdmin ? 'bg-purple-500' :
    isAdmin      ? 'bg-blue-500'   :
    isManager    ? 'bg-emerald-500' : 'bg-slate-400';

  const roleLabel =
    isSuperAdmin ? 'Pemilik Aplikasi' :
    isAdmin      ? 'Pemilik Toko'     :
    isManager    ? 'Finance' : 'Kasir';

  const Nav = () => (
    <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
      {NAV.map(entry => {
        if (isGroup(entry)) {
          if (!canShow(entry.roles, entry.key)) return null;
          const kids = entry.children.filter(c => canShow(c.roles, c.key));
          if (!kids.length) return null;
          const open        = openGroups.has(entry.key);
          const groupActive = kids.some(c => isActive(c.href, pathname));
          const GIcon       = entry.icon;

          return (
            <div key={entry.key}>
              <button
                onClick={() => toggleGroup(entry.key)}
                title={collapsed ? entry.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative
                  ${groupActive ? 'text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  ${collapsed ? 'justify-center' : ''}`}
              >
                <GIcon className={`w-4 h-4 flex-shrink-0 ${groupActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{entry.label}</span>
                    {groupActive && !open && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </>
                )}
                {collapsed && (
                  <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {entry.label}
                  </span>
                )}
              </button>

              {!collapsed && open && (
                <div className="ml-4 pl-3 border-l-2 border-gray-100 mt-0.5 space-y-0.5 mb-1">
                  {kids.map(child => {
                    const CIcon  = child.icon;
                    const active = isActive(child.href, pathname);
                    return (
                      <Link key={child.key} href={child.href}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                          ${active ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
                      >
                        <CIcon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                        <span>{child.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Single item
        if (!canShow(entry.roles, entry.key)) return null;
        const Icon   = entry.icon;
        const active = isActive(entry.href, pathname);

        return (
          <Link key={entry.key} href={entry.href} title={collapsed ? entry.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative
              ${active ? 'bg-blue-600 text-white shadow-sm shadow-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
              ${collapsed ? 'justify-center' : ''}`}
          >
            <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}`} />
            {!collapsed && <span className="flex-1 whitespace-nowrap">{entry.label}</span>}
            {active && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60" />}
            {collapsed && (
              <span className="absolute left-full ml-3 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                {entry.label}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-gray-100 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="bg-blue-600 p-2 rounded-xl flex-shrink-0">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900 leading-none">POS UMKM</p>
              {isSuperAdmin && activeTenant && (
                <p className="text-[10px] text-purple-500 font-medium truncate">{activeTenant.nama}</p>
              )}
            </div>
          </Link>
        ) : (
          <Link href="/dashboard">
            <div className="bg-blue-600 p-2 rounded-xl"><ShoppingCart className="w-4 h-4 text-white" /></div>
          </Link>
        )}
        <button onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex w-7 h-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* SUPERADMIN badge */}
      {isSuperAdmin && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl flex items-center gap-2">
          <Crown className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span className="text-xs font-semibold text-purple-700">Pemilik Aplikasi</span>
        </div>
      )}

      {/* KASIR badge - read-only reminder untuk laporan */}
      {isKasir && !collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <span className="text-xs text-slate-600">Laporan: lihat & export saja</span>
        </div>
      )}

      <Nav />

      {/* User footer */}
      <div className={`p-3 border-t border-gray-100 flex-shrink-0 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarBg}`}>
              {user?.nama?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 leading-none truncate">{user?.nama}</p>
              <p className="text-xs text-gray-400 mt-0.5">{roleLabel}</p>
            </div>
            <button onClick={() => { logout(); router.push('/login'); }} title="Logout"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={() => { logout(); router.push('/login'); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className={`hidden lg:flex flex-col border-r border-gray-100 shadow-sm transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
        style={{ height: '100vh', position: 'sticky', top: 0 }}>
        <SidebarContent />
      </aside>

      {/* Mobile */}
      <div className="lg:hidden">
        <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm h-14 flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg"><ShoppingCart className="w-4 h-4 text-white" /></div>
            <span className="text-base font-bold text-gray-800">POS UMKM</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarBg}`}>
              {user?.nama?.charAt(0).toUpperCase()}
            </div>
            <button onClick={() => setMobileOpen(o => !o)}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />}
        <aside className={`fixed top-0 left-0 bottom-0 z-50 w-[260px] shadow-xl transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <SidebarContent />
        </aside>
      </div>
    </>
  );
};