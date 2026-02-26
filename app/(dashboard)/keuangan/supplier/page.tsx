'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { useAuthStore } from '@/lib/store/authStore';
import { Button, Input, Modal, Card } from '@/components/ui';
import { Plus, Edit, Trash2, Truck, Phone, MapPin, AlertCircle } from 'lucide-react';

interface Supplier {
  id: string;
  nama: string;
  telepon?: string;
  alamat?: string;
  hutang: number;
  _count?: { pembelian: number };
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function SupplierPage() {
  const user = useAuthStore((s) => s.user);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ nama: '', telepon: '', alamat: '' });

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data.suppliers ?? []);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setFormData({ nama: '', telepon: '', alamat: '' });
    setIsModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({ nama: s.nama, telepon: s.telepon ?? '', alamat: s.alamat ?? '' });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nama.trim()) { alert('Nama supplier harus diisi'); return; }
    setSaving(true);
    try {
      const url = editingSupplier ? `/api/suppliers/${editingSupplier.id}` : '/api/suppliers';
      const method = editingSupplier ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      setIsModalOpen(false);
      loadSuppliers();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus supplier ini?')) return;
    const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.message);
    } else {
      loadSuppliers();
    }
  };

  const totalHutang = suppliers.reduce((s, x) => s + x.hutang, 0);

  return (
    <ProtectedRoute requireOwner>
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Truck className="w-6 h-6 text-blue-600" /> Manajemen Supplier
              </h1>
              <p className="text-sm text-gray-500 mt-1">Kelola data supplier dan hutang pembelian</p>
            </div>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Supplier
            </Button>
          </div>

          {/* Summary Card */}
          {totalHutang > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Total Hutang ke Supplier</p>
                <p className="text-xl font-bold text-red-600">{formatRupiah(totalHutang)}</p>
              </div>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Memuat data...</p>
            </div>
          ) : suppliers.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Belum ada supplier. Tambah supplier pertama!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((s) => (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{s.nama}</h3>
                        <p className="text-xs text-gray-400">{s._count?.pembelian ?? 0} transaksi</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {s.telepon && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Phone className="w-3.5 h-3.5" /> {s.telepon}
                    </div>
                  )}
                  {s.alamat && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                      <MapPin className="w-3.5 h-3.5" /> {s.alamat}
                    </div>
                  )}

                  <div className={`mt-3 pt-3 border-t ${s.hutang > 0 ? 'border-red-100' : 'border-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Hutang</span>
                      <span className={`text-sm font-bold ${s.hutang > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {s.hutang > 0 ? formatRupiah(s.hutang) : 'Lunas'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Supplier *</label>
            <Input value={formData.nama} onChange={(e) => setFormData({ ...formData, nama: e.target.value })} placeholder="CV. Maju Jaya" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telepon</label>
            <Input value={formData.telepon} onChange={(e) => setFormData({ ...formData, telepon: e.target.value })} placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
            <Input value={formData.alamat} onChange={(e) => setFormData({ ...formData, alamat: e.target.value })} placeholder="Alamat supplier" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
}