'use client';

// app/(dashboard)/users/page.tsx

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import {
  Users, Plus, X, Loader2, CheckCircle2,
  Mail, User, Shield, Store, Eye, EyeOff, Search,
} from 'lucide-react';

// ─── Tipe ─────────────────────────────────────────────────────────────────────
type UserRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'KASIR';
type UserItem = {
  id: string; nama: string; email: string;
  role: UserRole; outletId: string | null; createdAt: string;
};

const ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'MANAGER', 'KASIR'];

const roleBadge = (role: UserRole) => {
  const map: Record<UserRole, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-700',
    ADMIN:      'bg-blue-100 text-blue-700',
    MANAGER:    'bg-green-100 text-green-700',
    KASIR:      'bg-gray-100 text-gray-600',
  };
  return map[role];
};

const roleAvatar = (role: UserRole) => {
  const map: Record<UserRole, string> = {
    SUPERADMIN: 'bg-purple-500',
    ADMIN:      'bg-blue-500',
    MANAGER:    'bg-green-500',
    KASIR:      'bg-gray-400',
  };
  return map[role];
};

// ─── Form tambah user ─────────────────────────────────────────────────────────
type FormData = { nama: string; email: string; password: string; role: UserRole; outletId: string };
const defaultForm: FormData = { nama: '', email: '', password: '', role: 'KASIR', outletId: '' };

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const { user: currentUser } = useAuthStore();

  const [users,       setUsers]       = useState<UserItem[]>([]);
  const [outlets,     setOutlets]     = useState<{ id: string; nama: string }[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState<FormData>(defaultForm);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [search,      setSearch]      = useState('');
  const [filterRole,  setFilterRole]  = useState<UserRole | 'ALL'>('ALL');

  // ── Fetch users & outlets ───────────────────────────────────────────────────
  const fetchUsers = async () => {
    setLoading(true);
    const r = await fetch('/api/users');
    const d = await r.json();
    setUsers(d.users ?? []);
    setLoading(false);
  };

  const fetchOutlets = async () => {
    const r = await fetch('/api/outlets');
    const d = await r.json();
    setOutlets(d.outlets ?? []);
  };

  useEffect(() => { fetchUsers(); fetchOutlets(); }, []);

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    const matchSearch = u.nama.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  // ── Tambah user ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError('');
    if (!form.nama || !form.email || !form.password) {
      setError('Nama, email, dan password harus diisi'); return;
    }
    if (form.password.length < 6) {
      setError('Password minimal 6 karakter'); return;
    }
    setSaving(true);
    const r = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama: form.nama, email: form.email, password: form.password,
        role: form.role, outletId: form.outletId || null,
      }),
    });
    const d = await r.json();
    if (!r.ok) {
      setError(d.message ?? 'Gagal membuat user');
    } else {
      setSuccess(`User "${d.user.nama}" berhasil ditambahkan!`);
      setForm(defaultForm);
      setShowForm(false);
      await fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    }
    setSaving(false);
  };

  return (
    <ProtectedRoute requireOwner>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-sky-100 p-3 rounded-xl">
              <Users className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="text-sm text-gray-500">{users.length} user terdaftar</p>
            </div>
          </div>
          <button onClick={() => { setShowForm(true); setError(''); }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors text-sm shadow-sm shadow-blue-200">
            <Plus className="w-4 h-4" /> Tambah User
          </button>
        </div>

        {/* ── Success banner ───────────────────────────────────────────────── */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
          </div>
        )}

        {/* ── Filter & Search ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder="Cari nama atau email..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
          <select value={filterRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterRole(e.target.value as UserRole | 'ALL')}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="ALL">Semua Role</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* ── Tabel users ─────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Users className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">{search || filterRole !== 'ALL' ? 'Tidak ada hasil pencarian' : 'Belum ada user'}</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['User', 'Email', 'Role', 'Outlet', 'Bergabung'].map(h => (
                        <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${roleAvatar(u.role)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                              {u.nama.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-gray-800 text-sm">{u.nama}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Anda</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">{u.email}</td>
                        <td className="px-5 py-4">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleBadge(u.role)}`}>{u.role}</span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {outlets.find(o => o.id === u.outletId)?.nama ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="sm:hidden divide-y divide-gray-100">
                {filtered.map(u => (
                  <div key={u.id} className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${roleAvatar(u.role)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {u.nama.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 text-sm">{u.nama}</p>
                        {u.id === currentUser?.id && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">Anda</span>}
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${roleBadge(u.role)}`}>{u.role}</span>
                  </div>
                ))}
              </div>

              {/* Footer info */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 text-xs text-gray-400">
                Menampilkan {filtered.length} dari {users.length} user
              </div>
            </>
          )}
        </div>

        {/* ── Modal tambah user ────────────────────────────────────────────── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <h2 className="font-semibold text-gray-800">Tambah User Baru</h2>
                </div>
                <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl">
                    {error}
                  </div>
                )}

                {/* Nama */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Nama Lengkap
                  </label>
                  <input value={form.nama} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, nama: e.target.value }))}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </label>
                  <input type="email" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="budi@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                {/* Password */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Password
                  </label>
                  <div className="relative">
                    <input type={showPass ? 'text' : 'password'} value={form.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Minimal 6 karakter"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Role
                  </label>
                  <select value={form.role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Outlet */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5" /> Outlet
                  </label>
                  <select value={form.outletId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({ ...f, outletId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">— Outlet pertama (default) —</option>
                    {outlets.map(o => <option key={o.id} value={o.id}>{o.nama}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Kosongkan untuk assign ke outlet pertama secara otomatis</p>
                </div>
              </div>

              {/* Modal footer */}
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => { setShowForm(false); setError(''); setForm(defaultForm); }}
                  className="flex-1 border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm">
                  Batal
                </button>
                <button onClick={handleSubmit} disabled={saving}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {saving ? 'Menyimpan...' : 'Tambah User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}