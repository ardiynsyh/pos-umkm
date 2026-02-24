'use client';
// app/(dashboard)/admin/tenants/page.tsx — kelola semua tenant (SUPERADMIN only)

import { useEffect, useState } from 'react';
import {
  Building2, Users, Store, TrendingUp,
  CheckCircle, XCircle, Loader2, ChevronDown,
  Search, Shield,
} from 'lucide-react';

type Plan = 'FREE' | 'BASIC' | 'PRO';
type Tenant = {
  id: string; nama: string; slug: string; email: string;
  plan: Plan; isActive: boolean; maxOutlets: number; maxUsers: number;
  trialEndsAt?: string; createdAt: string;
  _count: { outlets: number; users: number; transactions: number };
};

const PLAN_BADGE: Record<Plan, string> = {
  FREE:  'bg-gray-100 text-gray-600',
  BASIC: 'bg-blue-100 text-blue-700',
  PRO:   'bg-purple-100 text-purple-700',
};

const PLAN_PRICE: Record<Plan, string> = {
  FREE:  'Gratis',
  BASIC: 'Rp 99rb/bln',
  PRO:   'Rp 299rb/bln',
};

export default function AdminTenantsPage() {
  const [tenants,  setTenants]  = useState<Tenant[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchTenants = async () => {
    setLoading(true);
    const r = await fetch('/api/admin/tenants');
    const d = await r.json();
    setTenants(d.tenants ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const updateTenant = async (tenantId: string, data: Partial<{ plan: Plan; isActive: boolean }>) => {
    setUpdating(tenantId);
    await fetch('/api/admin/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, ...data }),
    });
    await fetchTenants();
    setUpdating(null);
  };

  const filtered = tenants.filter(t =>
    t.nama.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  );

  // Stats
  const stats = {
    total:  tenants.length,
    active: tenants.filter(t => t.isActive).length,
    pro:    tenants.filter(t => t.plan === 'PRO').length,
    basic:  tenants.filter(t => t.plan === 'BASIC').length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-3 rounded-xl">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Tenant</h1>
          <p className="text-sm text-gray-500">Semua bisnis yang terdaftar di POS UMKM</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenant', value: stats.total,  icon: Building2,   color: 'text-blue-600   bg-blue-50' },
          { label: 'Aktif',        value: stats.active, icon: CheckCircle, color: 'text-green-600  bg-green-50' },
          { label: 'Plan PRO',     value: stats.pro,    icon: TrendingUp,  color: 'text-purple-600 bg-purple-50' },
          { label: 'Plan BASIC',   value: stats.basic,  icon: Store,       color: 'text-blue-600   bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.color.split(' ')[1]} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama bisnis atau email..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {/* Tenant list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Tidak ada tenant ditemukan</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Bisnis', 'Email', 'Plan', 'Outlet / User', 'Transaksi', 'Status', 'Aksi'].map(h => (
                      <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">{t.nama}</p>
                          <p className="text-xs text-gray-400">@{t.slug}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">{t.email}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_BADGE[t.plan]}`}>{t.plan}</span>
                          <span className="text-xs text-gray-400">{PLAN_PRICE[t.plan]}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1"><Store className="w-3 h-3" /> {t._count.outlets}/{t.maxOutlets}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {t._count.users}/{t.maxUsers}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{t._count.transactions.toLocaleString('id-ID')}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {t.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {t.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* Ubah plan */}
                          <div className="relative">
                            <select
                              value={t.plan}
                              onChange={e => updateTenant(t.id, { plan: e.target.value as Plan })}
                              disabled={updating === t.id}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-6 appearance-none"
                            >
                              <option value="FREE">FREE</option>
                              <option value="BASIC">BASIC</option>
                              <option value="PRO">PRO</option>
                            </select>
                            <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                          </div>
                          {/* Toggle aktif */}
                          <button
                            onClick={() => updateTenant(t.id, { isActive: !t.isActive })}
                            disabled={updating === t.id}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${t.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                          >
                            {updating === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filtered.map(t => (
                <div key={t.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-800">{t.nama}</p>
                      <p className="text-xs text-gray-400">{t.email}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_BADGE[t.plan]}`}>{t.plan}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span><Store className="w-3 h-3 inline mr-1" />{t._count.outlets} outlet</span>
                    <span><Users className="w-3 h-3 inline mr-1" />{t._count.users} user</span>
                    <span>{t._count.transactions} transaksi</span>
                  </div>
                  <div className="flex gap-2">
                    <select value={t.plan} onChange={e => updateTenant(t.id, { plan: e.target.value as Plan })}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-2 focus:outline-none bg-white">
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                    </select>
                    <button onClick={() => updateTenant(t.id, { isActive: !t.isActive })}
                      className={`text-xs px-3 py-2 rounded-lg font-medium ${t.isActive ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {t.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
              {filtered.length} dari {tenants.length} tenant
            </div>
          </>
        )}
      </div>
    </div>
  );
}