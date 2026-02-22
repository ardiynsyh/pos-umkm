'use client';
// app/(dashboard)/dashboard/page.tsx — Dashboard dengan analytics real-time

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';
import {
  TrendingUp, TrendingDown, ShoppingCart, Target,
  Clock, Package, BarChart3, ArrowRight, Loader2, Zap,
} from 'lucide-react';

// ─── Tipe ─────────────────────────────────────────────────────────────────────
type Analytics = {
  daily7:     { date: string; total: number }[];
  monthly6:   { month: string; total: number }[];
  hourlyData: { jam: string; total: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  comparison: { thisMonth: number; lastMonth: number; growth: number };
  today:      { total: number; count: number };
};
type TargetData = { monthly: { target: number; actual: number }; daily: { target: number; actual: number } };

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const fmtShort = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}jt` : n >= 1000 ? `${(n / 1000).toFixed(0)}rb` : String(n);

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
          <div className="relative w-full">
            <div
              className={`w-full rounded-t-sm transition-all duration-500 ${color}`}
              style={{ height: `${Math.max((d.value / max) * 80, d.value > 0 ? 4 : 0)}px` }}
            />
            {/* Tooltip */}
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
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
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
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }     = useAuthStore();
  const outletId     = user?.outletId ?? '';
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [target,    setTarget]    = useState<TargetData | null>(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!outletId) return;
    const load = async () => {
      setLoading(true);
      const now = new Date();
      const [a, t] = await Promise.all([
        fetch(`/api/analytics?outletId=${outletId}`).then(r => r.json()),
        fetch(`/api/sales-target?outletId=${outletId}&year=${now.getFullYear()}&month=${now.getMonth()+1}`).then(r => r.json()),
      ]);
      setAnalytics(a);
      setTarget(t);
      setLoading(false);
    };
    load();
  }, [outletId]);

  const monthlyPct = target ? (target.monthly.target > 0 ? Math.min(Math.round((target.monthly.actual / target.monthly.target) * 100), 100) : 0) : 0;
  const dailyPct   = target ? (target.daily.target > 0   ? Math.min(Math.round((target.daily.actual   / target.daily.target)   * 100), 100) : 0) : 0;
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5 pb-8">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 shadow-lg shadow-blue-200">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm mb-1">{today}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{getGreeting()}, {user?.nama?.split(' ')[0]}! 👋</h1>
            {user?.outlet?.nama && <p className="text-blue-200 text-sm mt-1">🏪 {user.outlet.nama}</p>}
          </div>
          <Link href="/kasir" className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold text-sm px-5 py-3 rounded-xl hover:bg-blue-50 transition-colors self-start sm:self-auto whitespace-nowrap">
            <Zap className="w-4 h-4" /> Buka Kasir
          </Link>
        </div>

        {/* Stats today */}
        {!loading && analytics && (
          <div className="relative mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Penjualan Hari Ini', value: fmtShort(analytics.today.total), sub: fmt(analytics.today.total) },
              { label: 'Transaksi Hari Ini', value: String(analytics.today.count), sub: 'transaksi' },
              { label: 'Pertumbuhan', value: `${analytics.comparison.growth > 0 ? '+' : ''}${analytics.comparison.growth}%`, sub: 'vs bulan lalu' },
              { label: 'Bulan Ini', value: fmtShort(analytics.comparison.thisMonth), sub: fmt(analytics.comparison.thisMonth) },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <p className="text-blue-200 text-xs mb-1">{s.label}</p>
                <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                <p className="text-blue-300 text-xs mt-0.5 truncate">{s.sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : analytics && (
        <>
          {/* ── Target Progress ──────────────────────────────────────────── */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Target Bulanan</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5">{monthlyPct}% tercapai</p>
                </div>
                <div className="relative flex items-center justify-center">
                  <ProgressRing pct={monthlyPct} color={monthlyPct >= 100 ? '#22c55e' : monthlyPct >= 70 ? '#3b82f6' : '#a78bfa'} />
                  <span className="absolute text-xs font-bold text-gray-700">{monthlyPct}%</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div className={`h-2 rounded-full transition-all duration-700 ${monthlyPct >= 100 ? 'bg-green-500' : monthlyPct >= 70 ? 'bg-blue-500' : 'bg-violet-400'}`}
                  style={{ width: `${monthlyPct}%` }} />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{fmt(target?.monthly.actual ?? 0)}</span>
                <span className="text-gray-400">/ {target?.monthly.target ? fmt(target.monthly.target) : 'Belum diset'}</span>
              </div>
              <Link href="/target-penjualan" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Target className="w-3 h-3" /> Atur target <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Daily */}
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
                <span className="text-gray-500">{fmt(target?.daily.actual ?? 0)}</span>
                <span className="text-gray-400">/ {target?.daily.target ? fmt(target.daily.target) : 'Belum diset'}</span>
              </div>
              <Link href="/shift" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                <Clock className="w-3 h-3" /> Lihat shift kasir <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* ── Charts ───────────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* 7 hari */}
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

            {/* 6 bulan */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Penjualan 6 Bulan</p>
                  <p className="text-xs text-gray-400">Tren bulanan pendapatan</p>
                </div>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <BarChart data={analytics.monthly6.map(d => ({ label: d.month, value: d.total }))} color="bg-emerald-500 hover:bg-emerald-600" />
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {analytics.comparison.growth >= 0
                  ? <><TrendingUp className="w-3 h-3 text-green-500" /><span className="text-green-600 font-medium">+{analytics.comparison.growth}%</span></>
                  : <><TrendingDown className="w-3 h-3 text-red-500" /><span className="text-red-500 font-medium">{analytics.comparison.growth}%</span></>}
                <span className="text-gray-400">vs bulan lalu</span>
              </div>
            </div>
          </div>

          {/* ── Produk Terlaris + Jam Tersibuk ────────────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Produk terlaris */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Produk Terlaris</p>
                  <p className="text-xs text-gray-400">Bulan ini berdasarkan qty terjual</p>
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

            {/* Jam tersibuk */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-gray-800">Aktivitas Per Jam</p>
                  <p className="text-xs text-gray-400">Penjualan hari ini per jam</p>
                </div>
                <Clock className="w-4 h-4 text-violet-400" />
              </div>
              <BarChart
                data={analytics.hourlyData.filter((_, i) => i % 2 === 0).map(d => ({ label: d.jam, value: d.total }))}
                color="bg-violet-400 hover:bg-violet-500"
              />
              {(() => {
                const busiest = analytics.hourlyData.reduce((a, b) => b.total > a.total ? b : a, analytics.hourlyData[0]);
                return busiest?.total > 0 ? (
                  <p className="mt-3 text-xs text-gray-400">
                    Jam tersibuk: <span className="font-semibold text-violet-600">{busiest.jam}</span> ({fmtShort(busiest.total)})
                  </p>
                ) : <p className="mt-3 text-xs text-gray-400">Belum ada transaksi hari ini</p>;
              })()}
            </div>
          </div>

          {/* ── Quick links ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/laporan',           label: 'Lihat Laporan',   icon: BarChart3,  color: 'text-blue-600   bg-blue-50' },
              { href: '/target-penjualan',  label: 'Atur Target',     icon: Target,     color: 'text-violet-600 bg-violet-50' },
              { href: '/shift',             label: 'Kelola Shift',    icon: Clock,      color: 'text-orange-600 bg-orange-50' },
              { href: '/produk',            label: 'Cek Stok',        icon: Package,    color: 'text-emerald-600 bg-emerald-50' },
            ].map(item => (
              <Link key={item.href} href={item.href}
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
