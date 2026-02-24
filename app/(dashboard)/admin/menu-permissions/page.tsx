// app/(dashboard)/admin/menu-permissions/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle2, 
  ArrowLeft,
  Building2,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Store
} from 'lucide-react';
import Link from 'next/link';
import { ALL_MENUS } from '@/lib/menu-permissions';

type Role = 'ADMIN' | 'MANAGER' | 'KASIR';
type Permissions = Record<Role, Record<string, boolean>>;

interface OutletData {
  outletId: string;
  outletName: string;
  tenantId: string;
  tenantName: string;
  permissions: Permissions;
}

const ROLES: { key: Role; label: string; color: string }[] = [
  { key: 'ADMIN', label: 'Admin', color: 'bg-blue-100 text-blue-700' },
  { key: 'MANAGER', label: 'Manager', color: 'bg-green-100 text-green-700' },
  { key: 'KASIR', label: 'Kasir', color: 'bg-gray-100 text-gray-600' },
];

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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
        enabled ? 'bg-purple-600' : 'bg-gray-300'
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

export default function AdminMenuPermissionsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [outlets, setOutlets] = useState<OutletData[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string>('');
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    fetchAllOutlets();
  }, []);

  useEffect(() => {
    if (selectedOutlet && outlets.length > 0) {
      const outlet = outlets.find(o => o.outletId === selectedOutlet);
      if (outlet) {
        setPermissions(outlet.permissions);
      }
    }
  }, [selectedOutlet, outlets]);

  const fetchAllOutlets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/menu-permissions');
      const data = await res.json();
      
      if (data.success) {
        setOutlets(data.data);
        if (data.data.length > 0) {
          setSelectedOutlet(data.data[0].outletId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch outlets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (role: Role, menuKey: string, value: boolean) => {
    if (!selectedOutlet || !permissions) return;

    const key = `${role}-${menuKey}`;
    setLoadingKey(key);

    // Optimistic update
    setPermissions(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [role]: { ...prev[role], [menuKey]: value }
      };
    });

    try {
      const res = await fetch('/api/admin/menu-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedOutlet,
          role,
          menuKey,
          isEnabled: value
        })
      });

      const data = await res.json();
      
      if (data.success) {
        setSavedKey(key);
        setTimeout(() => setSavedKey(null), 1500);
        
        // Update outlets state
        setOutlets(prev => prev.map(outlet => 
          outlet.outletId === selectedOutlet
            ? { ...outlet, permissions: { ...outlet.permissions, [role]: { ...outlet.permissions[role], [menuKey]: value } } }
            : outlet
        ));
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      // Revert on error
      setPermissions(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [role]: { ...prev[role], [menuKey]: !value }
        };
      });
    } finally {
      setLoadingKey(null);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedOutlet || !permissions) return;

    setSaving(true);
    try {
      const permArray = [];
      for (const role of ROLES) {
        for (const menu of ALL_MENUS) {
          permArray.push({
            role: role.key,
            menuKey: menu.key,
            isEnabled: permissions[role.key][menu.key]
          });
        }
      }

      const res = await fetch('/api/admin/menu-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedOutlet,
          permissions: permArray
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Semua perubahan berhasil disimpan!');
      }
    } catch (error) {
      alert('Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!selectedOutlet || !confirm('Reset semua permission ke default?')) return;

    try {
      const res = await fetch(`/api/admin/menu-permissions?tenantId=${selectedOutlet}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        // Reset ke default (semua true)
        const defaultPerms: Permissions = {
          ADMIN: {},
          MANAGER: {},
          KASIR: {}
        };
        ROLES.forEach(role => {
          ALL_MENUS.forEach(menu => {
            defaultPerms[role.key][menu.key] = true;
          });
        });
        setPermissions(defaultPerms);
        
        // Update outlets state
        setOutlets(prev => prev.map(outlet => 
          outlet.outletId === selectedOutlet
            ? { ...outlet, permissions: defaultPerms }
            : outlet
        ));
        
        alert('Permission berhasil direset');
      }
    } catch (error) {
      alert('Gagal reset permission');
    }
  };

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  if (!user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Manajemen Akses Menu</h1>
            </div>
            
            {selectedOutlet && permissions && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Semua
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <p className="text-sm text-purple-700">
                <span className="font-semibold">Mode SUPERADMIN:</span> Anda sedang mengelola permission 
                untuk semua outlet. Perubahan akan langsung diterapkan.
              </p>
            </div>
          </div>
        </div>

        {/* Outlet Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-gray-700">
              <Store className="w-5 h-5" />
              <span className="font-medium">Pilih Outlet:</span>
            </div>
            
            <div className="flex-1 flex flex-wrap gap-2">
              {outlets.map(outlet => (
                <button
                  key={outlet.outletId}
                  onClick={() => setSelectedOutlet(outlet.outletId)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedOutlet === outlet.outletId
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {outlet.outletName}
                  <span className="ml-2 text-xs opacity-75">
                    ({outlet.tenantName})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tabel Permission */}
        {selectedOutlet ? (
          loading ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-500">Memuat permission...</p>
            </div>
          ) : permissions ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                        Menu
                      </th>
                      {ROLES.map((role) => (
                        <th key={role.key} className="px-4 py-4 text-center w-32">
                          <span className={`inline-block text-xs font-semibold px-3 py-1.5 rounded-full ${role.color}`}>
                            {role.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {ALL_MENUS.map((menu) => (
                      <tr key={menu.key} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{menu.label}</div>
                          <div className="text-sm text-gray-500 mt-0.5">{menu.desc}</div>
                        </td>

                        {ROLES.map((role) => {
                          const key = `${role.key}-${menu.key}`;
                          const enabled = permissions[role.key]?.[menu.key] ?? true;
                          const isLoading = loadingKey === key;
                          const isSaved = savedKey === key;

                          return (
                            <td key={role.key} className="px-4 py-4 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <Toggle
                                  enabled={enabled}
                                  loading={isLoading}
                                  onChange={(val) => handleToggle(role.key, menu.key, val)}
                                />
                                <div className="h-4">
                                  {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                                  ) : isSaved ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <span className={enabled ? 'text-purple-500' : 'text-gray-400'}>
                                      {enabled ? (
                                        <Eye className="w-3.5 h-3.5" />
                                      ) : (
                                        <EyeOff className="w-3.5 h-3.5" />
                                      )}
                                    </span>
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
          ) : null
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
            <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Tidak ada outlet yang tersedia</p>
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 flex flex-wrap items-center gap-6 text-sm bg-white p-4 rounded-xl border border-gray-200">
          <span className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-500" />
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