'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, X, Check, Wallet } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Pengeluaran {
  id?: string;
  tanggal: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  createdAt?: string;
}

// ─── Kategori ─────────────────────────────────────────────────────────────────
const KATEGORI = [
  'Belanja Bahan', 'Gaji Karyawan', 'Listrik & Air',
  'Sewa Tempat', 'Peralatan', 'Transportasi', 'Lain-lain',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nilai);

const todayISO = () => new Date().toISOString().slice(0, 10);

const defaultForm = { tanggal: todayISO(), kategori: KATEGORI[0], keterangan: '', jumlah: '' };

// ─── Modal Form ───────────────────────────────────────────────────────────────
function ModalForm({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial?: Pengeluaran | null;
  onClose: () => void;
  onSave: (data: Omit<Pengeluaran, 'id' | 'createdAt'>) => void;
}) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (initial) {
      setForm({ tanggal: initial.tanggal, kategori: initial.kategori, keterangan: initial.keterangan, jumlah: String(initial.jumlah) });
    } else {
      setForm(defaultForm);
    }
  }, [initial, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan.trim() || !form.jumlah) return;
    onSave({ tanggal: form.tanggal, kategori: form.kategori, keterangan: form.keterangan.trim(), jumlah: Number(form.jumlah) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">{initial ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              {KATEGORI.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <input type="text" placeholder="Contoh: Beli tepung 10kg" value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
            <input type="number" placeholder="0" min={0} value={form.jumlah}
              onChange={(e) => setForm({ ...form, jumlah: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">Batal</button>
            <button type="submit" className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> Simpan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function PengeluaranPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [data, setData] = useState<Pengeluaran[]>([]);
  const [filterBulan, setFilterBulan] = useState(todayISO().slice(0, 7));
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Pengeluaran | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect jika bukan ADMIN
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pengeluaran?bulan=${filterBulan}`);
      const json = await res.json();
      setData(json.data ?? []);
    } catch {
      console.error('Gagal load pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterBulan]);

  const handleSave = async (form: Omit<Pengeluaran, 'id' | 'createdAt'>) => {
    try {
      if (editItem?.id) {
        await fetch(`/api/pengeluaran/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      } else {
        await fetch('/api/pengeluaran', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setModalOpen(false);
      setEditItem(null);
      loadData();
    } catch {
      alert('Gagal menyimpan pengeluaran');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/pengeluaran/${id}`, { method: 'DELETE' });
      setDeleteId(null);
      loadData();
    } catch {
      alert('Gagal menghapus pengeluaran');
    }
  };

  const totalBulan = data.reduce((sum, item) => sum + item.jumlah, 0);
  const perKategori = data.reduce<Record<string, number>>((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + item.jumlah;
    return acc;
  }, {});

  if (user?.role !== 'ADMIN') return null;

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-red-500" /> Catatan Pengeluaran
              </h1>
              <p className="text-sm text-gray-500 mt-1">Khusus Admin</p>
            </div>
            <button onClick={() => { setEditItem(null); setModalOpen(true); }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {/* Filter & Total */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-600">Bulan:</label>
              <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
            </div>
            <div className="sm:ml-auto text-right">
              <p className="text-xs text-gray-500">Total Pengeluaran</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(totalBulan)}</p>
            </div>
          </div>

          {/* Ringkasan per Kategori */}
          {Object.keys(perKategori).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan per Kategori</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(perKategori).map(([kat, total]) => (
                  <div key={kat} className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 truncate">{kat}</p>
                    <p className="text-sm font-semibold text-red-600">{formatRupiah(total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabel */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Memuat data...</div>
            ) : data.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Belum ada pengeluaran di bulan ini</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Kategori</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Keterangan</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Jumlah</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {format(new Date(item.tanggal), 'd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{item.kategori}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{item.keterangan}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatRupiah(item.jumlah)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => { setEditItem(item); setModalOpen(true); }}
                            className="text-gray-400 hover:text-blue-500 transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteId(item.id!)}
                            className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <ModalForm open={modalOpen} initial={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }} onSave={handleSave} />

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Hapus Pengeluaran?</h3>
            <p className="text-sm text-gray-500 mb-5">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">Batal</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}