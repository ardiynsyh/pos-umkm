'use client';
// app/(dashboard)/dashboard/page.tsx

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, Target, Clock, Package, BarChart3,
  ArrowRight, Loader2, Zap, Store, Users, ShoppingBag,
  CheckCircle, AlertCircle, Crown, MapPin, Phone,
  Wallet, ChevronRight,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type Analytics = {
  daily7:      { date: string; total: number }[];
  monthly6:    { month: string; total: number; pengeluaran: number; profit: number }[];
  hourlyData:  { jam: string; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  comparison:  { thisMonth: number; lastMonth: number; growth: number };
  today:       { total: number; count: number; pengeluaran: number; profit: number };
  lowStock:    { id: string; nama: string; stok: number; stokMinimal: number; satuan: string }[];
};

type TargetData = {
  monthly: { target: number; actual: number };
  daily:   { target: number; actual: number };
};

type TenantDetail = {
  id: string; nama: string; plan: string; isActive: boolean;
  maxOutlets: number; maxUsers: number; email?: string; phone?: string;
  outlets: {
    id: string; nama: string; alamat?: string; telepon?: string;
    _count: { users: number; products: number; transactions: number };
  }[];
  stats: {
    totalPendapatanBulanIni: number;
    totalTransaksiBulanIni:  number;
    totalProduk:             number;
    totalUser:               number;
    maxUsers:                number;
    maxOutlets:              number;
  };
};

const DEFAULT_TARGET: TargetData = {
  monthly: { target: 0, actual: 0 },
  daily:   { target: 0, actual: 0 },
};

const fmt      = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}jt`
  : n >= 1000    ? `${(n / 1000).toFixed(0)}rb`
  : String(n);

const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:       { label: 'Free',       color: 'text-gray-600',   bg: 'bg-gray-100'   },
  BASIC:      { label: 'Basic',      color: 'text-blue-600',   bg: 'bg-blue-100'   },
  PRO:        { label: 'Pro',        color: 'text-purple-600', bg: 'bg-purple-100' },
  ENTERPRISE: { label: 'Enterprise', color: 'text-amber-600',  bg: 'bg-amber-100'  },
};

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full">
            <div className={`w-full rounded-t-sm transition-all duration-500 ${color}`}
              style={{ height: `${Math.max((d.value / max) * 80, d.value > 0 ? 4 : 0)}px` }} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
              {fmtShort(d.value)}
            </div>
          </div>
          <span className="text-[9px] text-gray-400 truncate w-full text-center leading-none">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Progress ring ────────────────────────────────────────────────────────────
function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  );
}

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';
};

// ─── Komponen detail toko untuk ADMIN ────────────────────────────────────────
function TokoDetailCard({ tenant }: { tenant: TenantDetail }) {
  const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.FREE;

  const setupItems = [
    // ✅ Diubah: /outlets → /tenants
    { label: 'Outlet dibuat',        done: tenant.outlets.length > 0,               href: '/tenants' },
    { label: 'Produk ditambahkan',   done: tenant.stats.totalProduk > 0,            href: '/operasional' },
    { label: 'Staff ditambahkan',    done: tenant.stats.totalUser > 1,              href: '/users' },
    { label: 'Transaksi pertama',    done: tenant.stats.totalTransaksiBulanIni > 0, href: '/operasional' },
  ];
  const setupDone   = setupItems.filter(s => s.done).length;
  const setupTotal  = setupItems.length;
  const isComplete  = setupDone === setupTotal;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header toko */}
      <div className="p-5 border-b border-gray-50">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Store className="w-6 h-6 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900 truncate">{tenant.nama}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.bg} ${plan.color}`}>
                  {plan.label}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {tenant.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>
          </div>
          <Link href="/settings"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 flex-shrink-0">
            Kelola <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Stats toko */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-50">
        {[
          { label: 'Outlet',       value: tenant.outlets.length,               max: tenant.maxOutlets,     icon: Store,       color: 'text-blue-500' },
          { label: 'Users',        value: tenant.stats.totalUser,              max: tenant.stats.maxUsers, icon: Users,       color: 'text-purple-500' },
          { label: 'Produk',       value: tenant.stats.totalProduk,            max: null,                  icon: Package,     color: 'text-orange-500' },
          { label: 'Tx Bulan Ini', value: tenant.stats.totalTransaksiBulanIni, max: null,                  icon: ShoppingBag, color: 'text-emerald-500' },
        ].map((s, i) => (
          <div key={i} className="p-4 text-center">
            <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
            <p className="text-xl font-bold text-gray-800">{s.value}</p>
            {s.max !== null && (
              <p className="text-[10px] text-gray-400">dari {s.max}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Daftar outlet */}
      {tenant.outlets.length > 0 && (
        <div className="px-5 pb-4 border-t border-gray-50 mt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-4 mb-3">Outlet Aktif</p>
          <div className="space-y-2">
            {tenant.outlets.map(outlet => (
              <div key={outlet.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-8 h-8 bg-white border border-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store className="w-4 h-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{outlet.nama}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {outlet.alamat && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 truncate">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{outlet.alamat}
                      </span>
                    )}
                    {outlet.telepon && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                        <Phone className="w-2.5 h-2.5" />{outlet.telepon}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                  <span title="Produk"><Package className="w-3 h-3 inline" /> {outlet._count.products}</span>
                  <span title="Users"><Users className="w-3 h-3 inline" /> {outlet._count.users}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Setup checklist — hanya tampil jika belum complete */}
      {!isComplete && (
        <div className="px-5 pb-5 border-t border-gray-50">
          <div className="flex items-center justify-between mt-4 mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Setup Toko</p>
            <span className="text-xs font-bold text-blue-600">{setupDone}/{setupTotal}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
            <div className="h-1.5 rounded-full bg-blue-500 transition-all duration-700"
              style={{ width: `${(setupDone / setupTotal) * 100}%` }} />
          </div>
          <div className="space-y-2">
            {setupItems.map((item, i) => (
              <Link key={i} href={item.href}
                className={`flex items-center gap-2.5 py-1.5 group ${item.done ? 'opacity-60' : 'hover:opacity-80'}`}>
                {item.done
                  ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  : <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                }
                <span className={`text-sm flex-1 ${item.done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                  {item.label}
                </span>
                {!item.done && <ChevronRight className="w-3 h-3 text-gray-400 group-hover:text-blue-500 transition-colors" />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, _hasHydrated } = useAuthStore();
  const outletId     = user?.outletId ?? '';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin      = user?.role === 'ADMIN';
  const isManager    = user?.role === 'MANAGER';

  const [analytics,    setAnalytics]    = useState<Analytics | null>(null);
  const [target,       setTarget]       = useState<TargetData>(DEFAULT_TARGET);
  const [tenantDetail, setTenantDetail] = useState<TenantDetail | null>(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isSuperAdmin && !outletId && !isAdmin) return;

    const load = async () => {
      setLoading(true);
      try {
        const now         = new Date();
        const query       = outletId ? `outletId=${outletId}` : '';
        const targetQuery = `${query ? query + '&' : ''}year=${now.getFullYear()}&month=${now.getMonth() + 1}`;

        const promises: Promise<any>[] = [
          fetch(`/api/analytics?${query}`).then(r => r.json()),
          fetch(`/api/sales-target?${targetQuery}`).then(r => r.json()),
        ];

        if (isAdmin) {
          promises.push(fetch('/api/tenant/me').then(r => r.json()));
        }

        const results = await Promise.all(promises);
        const [a, t, td] = results;

        setAnalytics(a);
        setTarget(t?.monthly && t?.daily ? t : DEFAULT_TARGET);
        if (td?.tenant) setTenantDetail(td.tenant);
      } catch (e) {
        console.error(e);
        setTarget(DEFAULT_TARGET);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [outletId, isSuperAdmin, isAdmin, _hasHydrated]);

  const monthlyPct = (target.monthly?.target ?? 0) > 0
    ? Math.min(Math.round((target.monthly.actual / target.monthly.target) * 100), 100) : 0;
  const dailyPct = (target.daily?.target ?? 0) > 0
    ? Math.min(Math.round((target.daily.actual / target.daily.target) * 100), 100) : 0;

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // Quick links berbeda per role
  const quickLinks = isSuperAdmin
    ? [
        { href: '/tenants',                   label: 'Kelola Tenant',  icon: Crown,    color: 'text-purple-600 bg-purple-50'  },
        { href: '/keuangan/laporan',          label: 'Lihat Laporan',  icon: BarChart3, color: 'text-blue-600   bg-blue-50'   },
        // ✅ Diubah: /outlets → /tenants, label 'Semua Toko' → 'Semua Tenant'
        { href: '/tenants',                   label: 'Semua Tenant',   icon: Store,    color: 'text-emerald-600 bg-emerald-50' },
        { href: '/settings/menu-permissions', label: 'Akses Menu',     icon: Target,   color: 'text-orange-600 bg-orange-50'  },
      ]
    : isAdmin
    ? [
        { href: '/operasional',          label: 'Buka Kasir',   icon: Zap,      color: 'text-blue-600   bg-blue-50'   },
        { href: '/keuangan/laporan',     label: 'Lihat Laporan', icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
        { href: '/keuangan/pengeluaran', label: 'Pengeluaran',  icon: Wallet,   color: 'text-orange-600 bg-orange-50' },
        { href: '/operasional',          label: 'Cek Stok',     icon: Package,  color: 'text-emerald-600 bg-emerald-50' },
      ]
    : isManager
    ? [
        { href: '/keuangan/laporan',     label: 'Lihat Laporan',    icon: BarChart3,  color: 'text-blue-600   bg-blue-50'   },
        { href: '/keuangan/pengeluaran', label: 'Pengeluaran',      icon: Wallet,     color: 'text-orange-600 bg-orange-50' },
        { href: '/target-penjualan',     label: 'Target Penjualan', icon: Target,     color: 'text-violet-600 bg-violet-50' },
        { href: '/keuangan/pembelian',   label: 'Pembelian',        icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50' },
      ]
    : [ // KASIR
        { href: '/operasional',      label: 'Buka Kasir', icon: Zap,        color: 'text-blue-600   bg-blue-50'   },
        { href: '/operasional',      label: 'Pesanan',    icon: ShoppingBag, color: 'text-orange-600 bg-orange-50' },
        { href: '/karyawan/absensi', label: 'Absensi',   icon: Clock,      color: 'text-violet-600 bg-violet-50' },
        { href: '/karyawan/jadwal',  label: 'Jadwal',    icon: Target,     color: 'text-emerald-600 bg-emerald-50' },
      ];

  return (
    <div className="space-y-5 pb-8">
      {/* ── Hero banner ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 shadow-lg shadow-blue-200">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">{today}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {getGreeting()}, {user?.nama?.split(' ')[0]}! 👋
            </h1>
            {isSuperAdmin && (
              <p className="text-blue-200 text-sm mt-1">🏢 Dashboard Global — Semua Tenant</p>
            )}
            {isAdmin && tenantDetail && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-blue-200 text-sm">🏪 {tenantDetail.nama}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20 text-white">
                  {PLAN_CONFIG[tenantDetail.plan]?.label ?? tenantDetail.plan}
                </span>
                {tenantDetail.outlets.length > 0 && (
                  <span className="text-xs text-blue-300">{tenantDetail.outlets.length} outlet</span>
                )}
              </div>
            )}
            {(isManager || user?.role === 'KASIR') && user?.outlet?.nama && (
              <p className="text-blue-200 text-sm mt-1">🏪 {user.outlet.nama}</p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isSuperAdmin ? (
              <Link href="/tenants"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap">
                <Crown className="w-4 h-4" /> Kelola Tenant
              </Link>
            ) : (
              <Link href="/operasional"
                className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors whitespace-nowrap">
                <Zap className="w-4 h-4" /> Buka Kasir
              </Link>
            )}
          </div>
        </div>

        {!loading && analytics && (
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Penjualan Hari Ini', value: fmt(analytics.today.total),    sub: null },
              { label: 'Transaksi Hari Ini', value: analytics.today.count,         sub: 'transaksi' },
              {
                label: 'Pertumbuhan',
                value: `${analytics.comparison.growth >= 0 ? '+' : ''}${analytics.comparison.growth}%`,
                sub: 'vs bulan lalu',
              },
              { label: 'Bulan Ini', value: fmtShort(analytics.comparison.thisMonth), sub: fmt(analytics.comparison.thisMonth) },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="text-blue-200 text-xs mb-1">{s.label}</p>
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                {s.sub && <p className="text-blue-300 text-xs mt-0.5">{s.sub}</p>}
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="relative mt-5 flex items-center justify-center h-16">
            <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
          </div>
        )}
      </div>

      {/* ── Detail toko (khusus ADMIN) ────────────────────────────────────────── */}
      {isAdmin && (
        loading && !tenantDetail
          ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )
          : tenantDetail && <TokoDetailCard tenant={tenantDetail} />
      )}

      {/* ── Konten analytics ─────────────────────────────────────────────────── */}
      {!loading && analytics && (
        <>
          {!isSuperAdmin && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Target Bulanan</p>
                    <p className="text-lg font-bold text-gray-800 mt-0.5">{monthlyPct}% tercapai</p>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <ProgressRing pct={monthlyPct} color={monthlyPct >= 100 ? '#22c55e' : monthlyPct >= 70 ? '#3b82f6' : '#93c5fd'} />
                    <span className="absolute text-xs font-bold text-gray-700">{monthlyPct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all duration-700 ${monthlyPct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${monthlyPct}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{fmt(target.monthly.actual)}</span>
                  <span className="text-gray-400">/ {target.monthly.target > 0 ? fmt(target.monthly.target) : 'Belum diset'}</span>
                </div>
                <Link href="/target-penjualan" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Target className="w-3 h-3" /> Atur target <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Target Harian</p>
                    <p className="text-lg font-bold text-gray-800 mt-0.5">{dailyPct}% tercapai</p>
                  </div>
                  <div className="relative flex items-center justify-center">
                    <ProgressRing pct={dailyPct} color={dailyPct >= 100 ? '#22c55e' : dailyPct >= 70 ? '#f97316' : '#fdba74'} />
                    <span className="absolute text-xs font-bold text-gray-700">{dailyPct}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                  <div className={`h-2 rounded-full transition-all duration-700 ${dailyPct >= 100 ? 'bg-green-500' : dailyPct >= 70 ? 'bg-orange-400' : 'bg-orange-300'}`}
                    style={{ width: `${dailyPct}%` }} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{fmt(target.daily.actual)}</span>
                  <span className="text-gray-400">/ {target.daily.target > 0 ? fmt(target.daily.target) : 'Belum diset'}</span>
                </div>
                <Link href="/shift" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                  <Clock className="w-3 h-3" /> Lihat shift kasir <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}

          {(isAdmin || isManager) && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Pendapatan Hari Ini',  value: fmt(analytics.today.total),              color: 'text-blue-600',  bg: 'bg-blue-50',  icon: TrendingUp   },
                { label: 'Pengeluaran Hari Ini', value: fmt(analytics.today.pengeluaran ?? 0),   color: 'text-red-500',   bg: 'bg-red-50',   icon: TrendingDown },
                { label: 'Profit Hari Ini',      value: fmt(analytics.today.profit ?? 0),        color: 'text-green-600', bg: 'bg-green-50', icon: Wallet       },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                  <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Penjualan 7 Hari</p>
                  <p className="text-xs text-gray-400">Total harian dalam Rupiah</p>
                </div>
                <BarChart3 className="w-4 h-4 text-blue-400" />
              </div>
              <BarChart data={analytics.daily7.map(d => ({ label: d.date.split(',')[0], value: d.total }))} color="bg-blue-500 hover:bg-blue-600" />
              <div className="mt-3 flex justify-between text-xs text-gray-400">
                <span>Total: {fmt(analytics.daily7.reduce((s, d) => s + d.total, 0))}</span>
                <span>Avg: {fmt(Math.round(analytics.daily7.reduce((s, d) => s + d.total, 0) / 7))}/hari</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Tren 6 Bulan</p>
                  <p className="text-xs text-gray-400">Pendapatan vs Pengeluaran</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <BarChart data={analytics.monthly6.map(d => ({ label: d.month, value: d.total }))} color="bg-emerald-500 hover:bg-emerald-600" />
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {analytics.comparison.growth >= 0
                  ? <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-green-600 font-medium">+{analytics.comparison.growth}%</span></>
                  : <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-red-500 font-medium">{analytics.comparison.growth}%</span></>
                }
                <span className="text-gray-400">vs bulan lalu</span>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Produk Terlaris</p>
                  <p className="text-xs text-gray-400">Bulan ini berdasarkan qty</p>
                </div>
                <Package className="w-4 h-4 text-orange-400" />
              </div>
              <div className="space-y-3">
                {analytics.topProducts.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Belum ada data bulan ini</p>
                )}
                {analytics.topProducts.map((p, i) => {
                  const maxQty = analytics.topProducts[0]?.qty ?? 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-500'}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{p.qty} pcs</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-orange-400 transition-all duration-700"
                            style={{ width: `${(p.qty / maxQty) * 100}%` }} />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-600 flex-shrink-0">{fmtShort(p.revenue)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Stok Hampir Habis</p>
                  <p className="text-xs text-gray-400">Produk di bawah batas minimal</p>
                </div>
                <AlertCircle className="w-4 h-4 text-red-400" />
              </div>
              {(analytics.lowStock?.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                  <p className="text-sm text-gray-500">Semua stok aman</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {analytics.lowStock.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-2.5 bg-red-50 rounded-xl">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{p.nama}</p>
                        <div className="w-full bg-red-100 rounded-full h-1 mt-1">
                          <div className="h-1 rounded-full bg-red-400"
                            style={{ width: `${Math.min((p.stok / p.stokMinimal) * 100, 100)}%` }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-red-600">{p.stok}</p>
                        <p className="text-xs text-gray-400">{p.satuan}</p>
                      </div>
                    </div>
                  ))}
                  <Link href="/operasional" className="flex items-center justify-center gap-1 text-xs text-blue-600 hover:underline mt-2">
                    Lihat semua produk <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickLinks.map(item => (
              <Link key={item.href + item.label} href={item.href}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className={`w-10 h-10 rounded-xl ${item.color.split(' ')[1]} flex items-center justify-center`}>
                  <item.icon className={`w-5 h-5 ${item.color.split(' ')[0]}`} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">{item.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
