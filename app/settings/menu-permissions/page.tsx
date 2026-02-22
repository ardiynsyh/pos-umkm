'use client';

// app/settings/menu-permissions/page.tsx
// Halaman khusus SUPERADMIN untuk mengaktifkan/menonaktifkan menu per role

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// ─── Tipe ────────────────────────────────────────────────────────────────────
type Role = 'ADMIN' | 'MANAGER' | 'KASIR';
type Permissions = Record<Role, Record<string, boolean>>;

const MENUS = [
  { key: 'kasir',    label: 'Kasir',    desc: 'Halaman transaksi penjualan' },
  { key: 'produk',   label: 'Produk',   desc: 'Manajemen produk & stok' },
  { key: 'laporan',  label: 'Laporan',  desc: 'Laporan penjualan & keuangan' },
  { key: 'pesanan',  label: 'Pesanan',  desc: 'Daftar pesanan masuk' },
  { key: 'users',    label: 'Users',    desc: 'Manajemen pengguna' },
  { key: 'settings', label: 'Settings', desc: 'Pengaturan aplikasi' },
];

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: 'ADMIN',   label: 'Admin',   color: 'blue' },
  { key: 'MANAGER', label: 'Manager', color: 'green' },
  { key: 'KASIR',   label: 'Kasir',   color: 'gray' },
];

// ─── Komponen Toggle ─────────────────────────────────────────────────────────
function Toggle({
  enabled,
  loading,
  onChange,
}: {
  enabled: boolean;
  loading: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
        enabled ? 'bg-blue-500' : 'bg-gray-200'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function MenuPermissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [permissions, setPermissions] = useState<Permissions>({} as Permissions);
  const [loadingKey, setLoadingKey] = useState<string | null>(null); // "ADMIN-kasir"
  const [isFetching, setIsFetching] = useState(true);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // Guard: hanya SUPERADMIN
  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // Fetch permissions dari API
  useEffect(() => {
    setIsFetching(true);
    fetch('/api/menu-permissions')
      .then((r) => r.json())
      .then((d) => setPermissions(d.permissions ?? {}))
      .catch(console.error)
      .finally(() => setIsFetching(false));
  }, []);

  // Simpan perubahan satu toggle
  const handleToggle = async (role: Role, menuKey: string, value: boolean) => {
    const key = `${role}-${menuKey}`;
    setLoadingKey(key);

    // Optimistic update
    setPermissions((prev) => ({
      ...prev,
      [role]: { ...prev[role], [menuKey]: value },
    }));

    try {
      const res = await fetch('/api/menu-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, menuKey, isEnabled: value }),
      });

      if (!res.ok) throw new Error('Gagal menyimpan');

      // Tampilkan feedback singkat
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
    } catch {
      // Rollback jika gagal
      setPermissions((prev) => ({
        ...prev,
        [role]: { ...prev[role], [menuKey]: !value },
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Tombol Kembali */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-purple-100 p-3 rounded-xl">
          <Shield className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Akses Menu</h1>
          <p className="text-sm text-gray-500">
            Atur menu mana yang bisa diakses oleh setiap role pengguna
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <strong>Catatan:</strong> SUPERADMIN selalu memiliki akses ke semua menu dan tidak bisa
        dibatasi. Perubahan di sini berlaku secara langsung.
      </div>

      {/* Tabel Permission */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header tabel */}
        <div className="grid grid-cols-[2fr_repeat(3,_1fr)] bg-gray-50 border-b border-gray-200">
          <div className="px-6 py-4 text-sm font-semibold text-gray-600">Menu</div>
          {ROLES.map((role) => (
            <div key={role.key} className="px-4 py-4 text-center">
              <span
                className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${
                  role.color === 'blue'
                    ? 'bg-blue-100 text-blue-700'
                    : role.color === 'green'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {role.label}
              </span>
            </div>
          ))}
        </div>

        {/* Baris menu */}
        {MENUS.map((menu, idx) => (
          <div
            key={menu.key}
            className={`grid grid-cols-[2fr_repeat(3,_1fr)] items-center ${
              idx !== MENUS.length - 1 ? 'border-b border-gray-100' : ''
            } hover:bg-gray-50 transition-colors`}
          >
            {/* Nama menu */}
            <div className="px-6 py-4">
              <p className="font-medium text-gray-800">{menu.label}</p>
              <p className="text-xs text-gray-400">{menu.desc}</p>
            </div>

            {/* Toggle per role */}
            {ROLES.map((role) => {
              const key = `${role.key}-${menu.key}`;
              const enabled = permissions[role.key]?.[menu.key] ?? true;
              const isLoading = loadingKey === key;
              const isSaved = savedKey === key;

              return (
                <div key={role.key} className="px-4 py-4 flex flex-col items-center gap-1">
                  <Toggle
                    enabled={enabled}
                    loading={isLoading}
                    onChange={(val) => handleToggle(role.key, menu.key, val)}
                  />
                  <span className="text-xs h-4">
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                    ) : isSaved ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <span className={enabled ? 'text-blue-500' : 'text-gray-400'}>
                        {enabled ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          Menu aktif — pengguna bisa melihat &amp; mengakses
        </span>
        <span className="flex items-center gap-1.5">
          <EyeOff className="w-3.5 h-3.5 text-gray-400" />
          Menu nonaktif — menu tersembunyi dari navbar
        </span>
      </div>
    </div>
  );
}