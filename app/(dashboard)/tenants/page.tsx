'use client';
// app/(dashboard)/tenants/page.tsx
// Halaman khusus SUPERADMIN untuk kelola semua tenant

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import {
  Building2, Users, Package, TrendingUp, Plus,
  LogIn, Trash2, Loader2, MoreVertical, Crown,
} from 'lucide-react';

type Tenant = {
  id: string;
  nama: string;
  email?: string;
  plan: string;
  maxOutlets: number;
  createdAt: string;
  _count: { outlets: number; users: number };
  totalRevenue?: number;
};

const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  FREE:       { label: 'Free',       color: '#64748b', bg: '#f1f5f9' },
  BASIC:      { label: 'Basic',      color: '#2563eb', bg: '#dbeafe' },
  PRO:        { label: 'Pro',        color: '#7c3aed', bg: '#ede9fe' },
  ENTERPRISE: { label: 'Enterprise', color: '#d97706', bg: '#fef3c7' },
};

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

export default function TenantsPage() {
  const router               = useRouter();
  const { user, _hasHydrated, enterTenant } = useAuthStore();

  const [tenants,    setTenants]    = useState<Tenant[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');

  // Form tambah tenant
  const [form, setForm] = useState({
    nama: '', email: '', plan: 'FREE', maxOutlets: 1,
    adminNama: '', adminEmail: '', adminPassword: '',
  });

  useEffect(() => {
    if (!_hasHydrated) return;
    if (user?.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
      return;
    }
    fetchTenants();
  }, [_hasHydrated, user]);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/tenants');
      const data = await res.json();
      setTenants(data.tenants ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEnterTenant = (tenant: Tenant) => {
    enterTenant({ id: tenant.id, nama: tenant.nama, plan: tenant.plan });
    router.push('/dashboard');
  };

  const handleAddTenant = async () => {
    if (!form.nama || !form.adminEmail || !form.adminPassword) {
      setError('Nama tenant, email & password admin wajib diisi');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Gagal menambah tenant');
      setShowForm(false);
      setForm({ nama: '', email: '', plan: 'FREE', maxOutlets: 1, adminNama: '', adminEmail: '', adminPassword: '' });
      fetchTenants();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = tenants.filter(t =>
    t.nama.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!_hasHydrated || loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  if (user?.role !== 'SUPERADMIN') return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">SUPERADMIN</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Tenant</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola semua tenant yang menggunakan aplikasi POS</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Tambah Tenant
        </button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Tenant',  value: tenants.length,                              icon: Building2,  color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Outlet',  value: tenants.reduce((s, t) => s + t._count.outlets, 0), icon: Package, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Total User',    value: tenants.reduce((s, t) => s + t._count.users,   0), icon: Users,   color: 'text-violet-600 bg-violet-50' },
          { label: 'Plan Pro+',     value: tenants.filter(t => ['PRO','ENTERPRISE'].includes(t.plan)).length, icon: TrendingUp, color: 'text-orange-600 bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.color.split(' ')[1]} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color.split(' ')[0]}`} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-gray-800">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari tenant..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
      </div>

      {/* Tenant list */}
      <div className="grid gap-4">
        {filtered.map(tenant => {
          const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.FREE;
          return (
            <div key={tenant.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {tenant.nama.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{tenant.nama}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: plan.bg, color: plan.color }}>
                        {plan.label}
                      </span>
                    </div>
                    {tenant.email && <p className="text-sm text-gray-500 mt-0.5">{tenant.email}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>🏪 {tenant._count.outlets}/{tenant.maxOutlets} outlet</span>
                      <span>👤 {tenant._count.users} user</span>
                      <span>📅 {new Date(tenant.createdAt).toLocaleDateString('id-ID')}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEnterTenant(tenant)}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" /> Kelola
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada tenant terdaftar</p>
          </div>
        )}
      </div>

      {/* Modal tambah tenant */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Tambah Tenant Baru</h2>
              <p className="text-sm text-gray-500 mt-0.5">Buat tenant beserta akun admin-nya</p>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nama Bisnis / Tenant *</label>
                <input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))}
                  placeholder="Contoh: Warung Bu Sari"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email Bisnis</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="bisnis@email.com" type="email"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Plan</label>
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="FREE">Free</option>
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Maks. Outlet</label>
                  <input type="number" min={1} value={form.maxOutlets}
                    onChange={e => setForm(f => ({ ...f, maxOutlets: parseInt(e.target.value) || 1 }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Akun Admin Tenant</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nama Admin *</label>
                    <input value={form.adminNama} onChange={e => setForm(f => ({ ...f, adminNama: e.target.value }))}
                      placeholder="Nama pemilik / admin"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Email Admin *</label>
                    <input value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                      placeholder="admin@email.com" type="email"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Password Admin *</label>
                    <input value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))}
                      placeholder="Min. 8 karakter" type="password"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => { setShowForm(false); setError(''); }}
                className="flex-1 border border-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button onClick={handleAddTenant} disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Buat Tenant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}