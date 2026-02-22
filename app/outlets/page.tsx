'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { Button, Input, Modal, Card } from '@/components/ui';
import { Plus, Edit, Trash2, Store, Users, Package } from 'lucide-react';

interface Outlet {
  id: string;
  nama: string;
  alamat?: string;
  telepon?: string;
  _count?: { users: number; products: number; tables: number };
}

export default function OutletsPage() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', alamat: '', telepon: '' });

  useEffect(() => { loadOutlets(); }, []);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/outlets');
      const data = await res.json();
      setOutlets(data.outlets ?? []);
    } catch {
      console.error('Gagal load outlets');
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingOutlet(null);
    setFormData({ nama: '', alamat: '', telepon: '' });
    setIsModalOpen(true);
  };

  const openEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({ nama: outlet.nama, alamat: outlet.alamat ?? '', telepon: outlet.telepon ?? '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) { alert('Nama outlet harus diisi'); return; }
    setSaving(true);
    try {
      let res: Response;
      if (editingOutlet) {
        res = await fetch(`/api/outlets/${editingOutlet.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        res = await fetch('/api/outlets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      if (!res.ok) throw new Error('Gagal menyimpan outlet');
      setIsModalOpen(false);
      loadOutlets();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus outlet ini? Semua data terkait akan ikut terhapus.')) return;
    try {
      const res = await fetch(`/api/outlets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus outlet');
      loadOutlets();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <ProtectedRoute requireSuperAdmin>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Store className="w-6 h-6 text-teal-600" /> Manajemen Outlet
              </h1>
              <p className="text-sm text-gray-500 mt-1">Kelola semua cabang / outlet bisnis</p>
            </div>
            <Button onClick={openAdd}>
              <Plus className="w-5 h-5 mr-2" /> Tambah Outlet
            </Button>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Memuat outlet...</p>
            </div>
          ) : outlets.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Belum ada outlet. Tambah outlet pertama!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {outlets.map((outlet) => (
                <div key={outlet.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <Store className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{outlet.nama}</h3>
                        {outlet.alamat && <p className="text-xs text-gray-500 mt-0.5">{outlet.alamat}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(outlet)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(outlet.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {outlet.telepon && (
                    <p className="text-xs text-gray-400 mb-3">📞 {outlet.telepon}</p>
                  )}

                  <div className="flex gap-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{outlet._count?.users ?? 0} user</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Package className="w-3.5 h-3.5" />
                      <span>{outlet._count?.products ?? 0} produk</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-gray-400 break-all font-mono bg-gray-50 rounded px-2 py-1">
                      ID: {outlet.id}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingOutlet ? 'Edit Outlet' : 'Tambah Outlet'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Outlet *</label>
            <Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Cabang Sudirman" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <Input value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat lengkap outlet" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <Input value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
              placeholder="08xxxxxxxxxx" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}
