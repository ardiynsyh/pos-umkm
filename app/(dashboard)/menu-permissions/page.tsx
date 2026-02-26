// PATH: app/(dashboard)/settings/menu-permissions/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type Role = 'ADMIN' | 'MANAGER' | 'KASIR';
type Permissions = Record<Role, Record<string, boolean>>;

const MENUS = [
  { key: 'kasir',            label: 'Kasir',            desc: 'Halaman transaksi penjualan' },
  { key: 'produk',           label: 'Produk',           desc: 'Manajemen produk & stok' },
  { key: 'laporan',          label: 'Laporan',          desc: 'Laporan penjualan & keuangan' },
  { key: 'pesanan',          label: 'Pesanan',          desc: 'Daftar pesanan masuk' },
  { key: 'pengeluaran',      label: 'Pengeluaran',      desc: 'Catatan pengeluaran toko' },
  { key: 'supplier',         label: 'Supplier',         desc: 'Manajemen data supplier' },
  { key: 'target-penjualan', label: 'Target Penjualan', desc: 'Atur target bulanan & harian' },
  { key: 'users',            label: 'Users',            desc: 'Manajemen pengguna' },
  { key: 'settings',         label: 'Settings',         desc: 'Pengaturan aplikasi' },
  { key: 'absensi',          label: 'Absensi',          desc: 'Absensi karyawan' },
  { key: 'jadwal',           label: 'Jadwal',           desc: 'Jadwal kerja' },
  { key: 'log-aktivitas',    label: 'Log Aktivitas',    desc: 'Catatan aktivitas' },
  { key: 'payroll',          label: 'Payroll',          desc: 'Penggajian karyawan' },
];

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: 'ADMIN',   label: 'Admin',   color: 'bg-blue-100 text-blue-700' },
  { key: 'MANAGER', label: 'Manager', color: 'bg-green-100 text-green-700' },
  { key: 'KASIR',   label: 'Kasir',   color: 'bg-gray-100 text-gray-600' },
];

function Toggle({ enabled, loading, onChange }: {
  enabled: boolean; loading: boolean; onChange: (val: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
        enabled ? 'bg-blue-600' : 'bg-gray-300'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

export default function MenuPermissionsPage() {
  const router = useRouter();
  const { user, _hasHydrated } = useAuthStore();

  const [permissions,    setPermissions]    = useState<Permissions>({} as Permissions);
  const [loadingKey,     setLoadingKey]     = useState<string | null>(null);
  const [isFetching,     setIsFetching]     = useState(true);
  const [savedKey,       setSavedKey]       = useState<string | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [outlets,        setOutlets]        = useState<{ id: string; nama: string }[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');

  // Guard: hanya SUPERADMIN
  useEffect(() => {
    if (!_hasHydrated) return;
    if (user && user.role !== 'SUPERADMIN') router.replace('/dashboard');
  }, [user, _hasHydrated, router]);

  // Fetch outlets saat mount
  useEffect(() => {
    if (!_hasHydrated || !user || user.role !== 'SUPERADMIN') return;
    fetchOutlets();
  }, [_hasHydrated, user]);

  // ✅ Fetch permissions setiap kali outlet berubah — kirim outletId via query param
  useEffect(() => {
    if (selectedOutlet) fetchPermissions(selectedOutlet);
  }, [selectedOutlet]);

  const fetchOutlets = async () => {
    try {
      const res  = await fetch('/api/outlets');
      const data = await res.json();
      const list: { id: string; nama: string }[] = data.outlets ?? [];
      setOutlets(list);
      if (list.length > 0) {
        setSelectedOutlet(list[0].id);
      } else {
        setIsFetching(false);
      }
    } catch (err) {
      console.error('Failed to fetch outlets:', err);
      setError('Gagal memuat daftar outlet');
      setIsFetching(false);
    }
  };

  // ✅ FIX: kirim outletId sebagai query param agar API filter per outlet yang benar
  const fetchPermissions = async (outletId: string) => {
    setIsFetching(true);
    setError(null);
    try {
      const res  = await fetch(`/api/menu-permissions?outletId=${outletId}`);
      const data = await res.json();
      if (data.permissions) {
        setPermissions(data.permissions);
      } else {
        setError('Gagal memuat permissions');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Gagal mengambil data');
    } finally {
      setIsFetching(false);
    }
  };

  // ✅ FIX: kirim outletId (selectedOutlet) di body request PUT
  const handleToggle = async (role: Role, menuKey: string, value: boolean) => {
    const key = `${role}-${menuKey}`;
    setLoadingKey(key);
    setError(null);

    // Optimistic update
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [menuKey]: value },
    }));

    try {
      const res = await fetch('/api/menu-permissions', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          role:      role,
          menuKey:   menuKey,
          isEnabled: value,
          outletId:  selectedOutlet, // ✅ kirim outletId yang dipilih di UI
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Gagal menyimpan: ${res.status}`);
      }

      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message ?? 'Gagal menyimpan perubahan');
      // Revert on error
      setPermissions(prev => ({
        ...prev,
        [role]: { ...prev[role], [menuKey]: !value },
      }));
    } finally {
      setLoadingKey(null);
    }
  };

  // Tunggu rehidrasi
  if (!_hasHydrated) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  if (!user || user.role !== 'SUPERADMIN') return null;

  if (isFetching) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Back */}
        <div className="mb-6">
          <Link href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
          </Link>
        </div>

        {/* Title */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Akses Menu</h1>
              <p className="text-sm text-gray-500 mt-1">
                Atur menu mana yang bisa diakses oleh setiap role pengguna per outlet
              </p>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">Catatan:</span> SUPERADMIN selalu memiliki akses ke semua menu.
              Perubahan berlaku langsung dan spesifik per outlet yang dipilih.
            </p>
          </div>

          {/* ✅ Pilih Outlet */}
          {outlets.length > 0 ? (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Outlet
              </label>
              <select
                value={selectedOutlet}
                onChange={e => setSelectedOutlet(e.target.value)}
                className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {outlets.map(outlet => (
                  <option key={outlet.id} value={outlet.id}>{outlet.nama}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Permission yang diatur berlaku untuk outlet ini
              </p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-700">Belum ada outlet yang terdaftar.</p>
            </div>
          )}
        </div>

        {/* Tabel Permission */}
        {selectedOutlet && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 w-1/3">Menu</th>
                    {ROLES.map(role => (
                      <th key={role.key} className="px-4 py-4 text-center w-1/6">
                        <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${role.color}`}>
                          {role.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {MENUS.map(menu => (
                    <tr key={menu.key} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{menu.label}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{menu.desc}</div>
                      </td>
                      {ROLES.map(role => {
                        const key       = `${role.key}-${menu.key}`;
                        const enabled   = permissions[role.key]?.[menu.key] ?? true;
                        const isLoading = loadingKey === key;
                        const isSaved   = savedKey === key;
                        return (
                          <td key={role.key} className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <Toggle
                                enabled={enabled}
                                loading={isLoading}
                                onChange={val => handleToggle(role.key, menu.key, val)}
                              />
                              <div className="h-4 flex items-center justify-center">
                                {isLoading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                ) : isSaved ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                ) : enabled ? (
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                ) : (
                                  <EyeOff className="w-3.5 h-3.5 text-gray-300" />
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm bg-white p-4 rounded-xl border border-gray-200">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="text-gray-600">Menu aktif — dapat diakses</span>
          </span>
          <span className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">Menu nonaktif — tersembunyi</span>
          </span>
        </div>

      </div>
    </div>
  );
}
