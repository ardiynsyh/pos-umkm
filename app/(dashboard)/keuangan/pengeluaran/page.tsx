// PATH: app/keuangan/pengeluaran/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { useAuthStore } from '@/lib/store/authStore';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, X, Check, Wallet, ShoppingBag, Info } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Pengeluaran {
  id?: string;
  tanggal: string;
  kategori: string;
  keterangan: string;
  jumlah: number;
  source?: 'manual' | 'pembelian'; // ditentukan dari kategori, bukan dari /api/pembelian
  createdAt?: string;
}

// ─── Konstanta ────────────────────────────────────────────────────────────────
// Kategori yang masuk otomatis dari proses pembelian stok (tidak bisa diedit/hapus)
const KATEGORI_OTOMATIS = ['Pembelian Stok', 'Pembelian Stok (Sebagian)', 'Pelunasan Hutang'];

// Kategori yang bisa dipilih saat input manual
const KATEGORI_MANUAL = [
  'Belanja Bahan', 'Gaji Karyawan', 'Listrik & Air',
  'Sewa Tempat', 'Peralatan', 'Transportasi', 'Lain-lain',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(nilai);

const todayISO = () => new Date().toISOString().slice(0, 10);
const defaultForm = { tanggal: todayISO(), kategori: KATEGORI_MANUAL[0], keterangan: '', jumlah: '' };

/** Tentukan source berdasarkan kategori — tidak perlu API terpisah */
const getSource = (kategori: string): 'manual' | 'pembelian' =>
  KATEGORI_OTOMATIS.includes(kategori) ? 'pembelian' : 'manual';

// ─── Modal Form ───────────────────────────────────────────────────────────────
function ModalForm({
  open, initial, onClose, onSave,
}: {
  open: boolean;
  initial?: Pengeluaran | null;
  onClose: () => void;
  onSave: (data: Omit<Pengeluaran, 'id' | 'createdAt' | 'source'>) => void;
}) {
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (initial) {
      setForm({
        tanggal:    initial.tanggal,
        kategori:   initial.kategori,
        keterangan: initial.keterangan,
        jumlah:     String(initial.jumlah),
      });
    } else {
      setForm(defaultForm);
    }
  }, [initial, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.keterangan.trim() || !form.jumlah) return;
    onSave({
      tanggal:    form.tanggal,
      kategori:   form.kategori,
      keterangan: form.keterangan.trim(),
      jumlah:     Number(form.jumlah),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {initial ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
            <input type="date" value={form.tanggal}
              onChange={e => setForm({ ...form, tanggal: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
            <select value={form.kategori}
              onChange={e => setForm({ ...form, kategori: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400">
              {KATEGORI_MANUAL.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <input type="text" placeholder="Contoh: Beli tepung 10kg" value={form.keterangan}
              onChange={e => setForm({ ...form, keterangan: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp)</label>
            <input type="number" placeholder="0" min={0} value={form.jumlah}
              onChange={e => setForm({ ...form, jumlah: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
              Batal
            </button>
            <button type="submit"
              className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-2">
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
  const user   = useAuthStore(state => state.user);
  const router = useRouter();

  const [allData,     setAllData]     = useState<Pengeluaran[]>([]);
  const [filterBulan, setFilterBulan] = useState(todayISO().slice(0, 7));
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editItem,    setEditItem]    = useState<Pengeluaran | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [viewTab,     setViewTab]     = useState<'semua' | 'manual' | 'pembelian'>('semua');

  useEffect(() => {
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  // ── Load data — hanya dari /api/pengeluaran (single source of truth) ──────
  const loadData = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`/api/pengeluaran?bulan=${filterBulan}`);
      const json = await res.json();

      // Tentukan source dari kategori — tidak perlu fetch /api/pembelian
      const items: Pengeluaran[] = (json.data ?? []).map((d: Pengeluaran) => ({
        ...d,
        source: getSource(d.kategori),
      }));

      setAllData(items);
    } catch (err) {
      console.error('Gagal load pengeluaran', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [filterBulan]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (form: Omit<Pengeluaran, 'id' | 'createdAt' | 'source'>) => {
    try {
      if (editItem?.id) {
        await fetch(`/api/pengeluaran/${editItem.id}`, {
          method:  'PUT',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        });
      } else {
        await fetch('/api/pengeluaran', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
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

  // ── Derived state ─────────────────────────────────────────────────────────
  const manualData    = allData.filter(d => d.source === 'manual');
  const pembelianData = allData.filter(d => d.source === 'pembelian');

  const displayData =
    viewTab === 'manual'    ? manualData    :
    viewTab === 'pembelian' ? pembelianData :
    allData;

  const totalManual    = manualData.reduce((s, i) => s + i.jumlah, 0);
  const totalPembelian = pembelianData.reduce((s, i) => s + i.jumlah, 0);
  const totalSemua     = totalManual + totalPembelian;

  const perKategori = allData.reduce<Record<string, number>>((acc, item) => {
    acc[item.kategori] = (acc[item.kategori] || 0) + item.jumlah;
    return acc;
  }, {});

  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-6 h-6 text-red-500" /> Catatan Pengeluaran
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manual + otomatis dari pembelian stok</p>
            </div>
            <button
              onClick={() => { setEditItem(null); setModalOpen(true); }}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>

          {/* ── Summary Cards ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col justify-between">
              <label className="text-xs text-gray-500 font-medium mb-1">Filter Bulan</label>
              <input type="month" value={filterBulan}
                onChange={e => setFilterBulan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-full" />
            </div>
            <div className="bg-red-50 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Total Semua</p>
              <p className="text-xl font-bold text-red-600">{formatRupiah(totalSemua)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <ShoppingBag className="w-3 h-3" /> Dari Pembelian Stok
              </p>
              <p className="text-xl font-bold text-orange-600">{formatRupiah(totalPembelian)}</p>
            </div>
            <div className="bg-pink-50 rounded-xl shadow-sm p-4">
              <p className="text-xs text-gray-500">Biaya Operasional</p>
              <p className="text-xl font-bold text-pink-600">{formatRupiah(totalManual)}</p>
            </div>
          </div>

          {/* ── Ringkasan per Kategori ─────────────────────────────────── */}
          {Object.keys(perKategori).length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Ringkasan per Kategori</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(perKategori)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kat, total]) => (
                    <div key={kat} className={`rounded-lg p-3 ${KATEGORI_OTOMATIS.includes(kat) ? 'bg-orange-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-gray-500 truncate">{kat}</p>
                      <p className="text-sm font-semibold text-red-600">{formatRupiah(total)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ── Info banner pembelian otomatis ─────────────────────────── */}
          {pembelianData.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                <strong>{pembelianData.length} entri</strong> dari pembelian stok tercatat otomatis di bulan ini.
                Entri ini tidak bisa diedit atau dihapus dari halaman ini.
              </span>
            </div>
          )}

          {/* ── View Tabs ──────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-4">
            {[
              { key: 'semua',     label: `Semua (${allData.length})` },
              { key: 'manual',    label: `Manual (${manualData.length})` },
              { key: 'pembelian', label: `Dari Pembelian (${pembelianData.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setViewTab(t.key as typeof viewTab)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  viewTab === t.key ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tabel ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                <div className="w-6 h-6 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat data...
              </div>
            ) : displayData.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Belum ada pengeluaran di bulan ini</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Kategori</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden sm:table-cell">Keterangan</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Jumlah</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Sumber</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayData.map((item, idx) => (
                    <tr key={`${item.source}-${item.id ?? idx}-${idx}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                        {format(new Date(item.tanggal), 'd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.source === 'pembelian' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{item.keterangan}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-800">
                        {formatRupiah(item.jumlah)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.source === 'pembelian' ? (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center justify-center gap-1">
                            <ShoppingBag className="w-3 h-3" /> Auto
                          </span>
                        ) : (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            ✏️ Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {/* Tombol edit/hapus hanya untuk entri manual */}
                        {item.source !== 'pembelian' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditItem(item); setModalOpen(true); }}
                              className="text-gray-400 hover:text-blue-500 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(item.id!)}
                              className="text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                      Total {viewTab === 'semua' ? 'Semua' : viewTab === 'pembelian' ? 'Pembelian' : 'Manual'}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-red-600">
                      {formatRupiah(displayData.reduce((s, i) => s + i.jumlah, 0))}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* ── Modal Tambah/Edit ───────────────────────────────────────────── */}
      <ModalForm
        open={modalOpen}
        initial={editItem}
        onClose={() => { setModalOpen(false); setEditItem(null); }}
        onSave={handleSave}
      />

      {/* ── Modal Konfirmasi Hapus ──────────────────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Hapus Pengeluaran?</h3>
            <p className="text-sm text-gray-500 mb-5">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
                Batal
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-lg py-2 text-sm font-medium">
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
