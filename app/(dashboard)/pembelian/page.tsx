'use client';

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { useAuthStore } from '@/lib/store/authStore';
import { Button, Input, Modal } from '@/components/ui';
import { Plus, Trash2, ShoppingBag, CheckCircle, Clock, AlertCircle, X, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Supplier { id: string; nama: string; }
interface Product { id: string; nama: string; stok: number; hargaBeli: number; }
interface PembelianItem { productId: string; productName: string; jumlah: number; hargaBeli: number; subtotal: number; }
interface Pembelian {
  id: string;
  tanggal: string;
  supplier: { nama: string };
  total: number;
  dibayar: number;
  sisaHutang: number;
  status: 'LUNAS' | 'BELUM_LUNAS' | 'SEBAGIAN';
  keterangan?: string;
  items: { id: string; jumlah: number; hargaBeli: number; subtotal: number; product: { nama: string } }[];
}

const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const statusBadge = (status: string) => {
  if (status === 'LUNAS') return 'bg-green-100 text-green-700';
  if (status === 'SEBAGIAN') return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const statusLabel = (status: string) => {
  if (status === 'LUNAS') return 'Lunas';
  if (status === 'SEBAGIAN') return 'Sebagian';
  return 'Belum Lunas';
};

export default function PembelianPage() {
  const user = useAuthStore((s) => s.user);
  const [pembelian, setPembelian] = useState<Pembelian[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBayarOpen, setIsBayarOpen] = useState(false);
  const [selectedPembelian, setSelectedPembelian] = useState<Pembelian | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().slice(0, 7));
  const [bayarAmount, setBayarAmount] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    tanggal: new Date().toISOString().slice(0, 10),
    dibayar: '',
    keterangan: '',
  });
  const [items, setItems] = useState<PembelianItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemJumlah, setItemJumlah] = useState('');
  const [itemHarga, setItemHarga] = useState('');

  useEffect(() => {
    loadData();
    fetch('/api/suppliers').then(r => r.json()).then(d => setSuppliers(d.suppliers ?? []));
    fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products ?? []));
  }, [filterBulan]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pembelian?bulan=${filterBulan}`);
      const data = await res.json();
      setPembelian(data.pembelian ?? []);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!selectedProductId || !itemJumlah || !itemHarga) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    const jumlah = parseInt(itemJumlah);
    const harga = parseFloat(itemHarga);
    setItems(prev => {
      const existing = prev.findIndex(i => i.productId === selectedProductId);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], jumlah: updated[existing].jumlah + jumlah, subtotal: (updated[existing].jumlah + jumlah) * harga };
        return updated;
      }
      return [...prev, { productId: product.id, productName: product.nama, jumlah, hargaBeli: harga, subtotal: jumlah * harga }];
    });
    setSelectedProductId('');
    setItemJumlah('');
    setItemHarga('');
  };

  const removeItem = (productId: string) => setItems(prev => prev.filter(i => i.productId !== productId));

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const handleSave = async () => {
    if (!formData.supplierId) { alert('Pilih supplier'); return; }
    if (items.length === 0) { alert('Tambahkan minimal 1 produk'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/pembelian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, items, total, dibayar: parseFloat(formData.dibayar) || 0 }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      setIsFormOpen(false);
      setItems([]);
      setFormData({ supplierId: '', tanggal: new Date().toISOString().slice(0, 10), dibayar: '', keterangan: '' });
      loadData();
      // Refresh products untuk update stok
      fetch('/api/products').then(r => r.json()).then(d => setProducts(d.products ?? []));
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleBayar = async () => {
    if (!selectedPembelian || !bayarAmount) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pembelian/${selectedPembelian.id}/bayar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jumlah: parseFloat(bayarAmount) }),
      });
      if (!res.ok) throw new Error('Gagal bayar hutang');
      setIsBayarOpen(false);
      setBayarAmount('');
      loadData();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const totalBulan = pembelian.reduce((s, p) => s + p.total, 0);
  const totalHutang = pembelian.reduce((s, p) => s + p.sisaHutang, 0);

  return (
    <ProtectedRoute requireOwner>
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-blue-600" /> Pembelian & Stok Masuk
              </h1>
              <p className="text-sm text-gray-500 mt-1">Catat pembelian bahan baku — stok otomatis bertambah</p>
            </div>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Catat Pembelian
            </Button>
          </div>

          {/* Filter & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <label className="text-xs text-gray-500 block mb-1">Filter Bulan</label>
              <input type="month" value={filterBulan} onChange={(e) => setFilterBulan(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-xs text-gray-500">Total Pembelian Bulan Ini</p>
              <p className="text-xl font-bold text-blue-600">{formatRupiah(totalBulan)}</p>
            </div>
            <div className={`rounded-xl p-4 shadow-sm ${totalHutang > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <p className="text-xs text-gray-500">Sisa Hutang Bulan Ini</p>
              <p className={`text-xl font-bold ${totalHutang > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatRupiah(totalHutang)}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Memuat data...</p>
              </div>
            ) : pembelian.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada pembelian di bulan ini</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Supplier</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Item</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Total</th>
                    <th className="text-right px-4 py-3 text-gray-600 font-medium">Sisa Hutang</th>
                    <th className="text-center px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pembelian.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">
                        {format(new Date(p.tanggal), 'd MMM yyyy', { locale: id })}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{p.supplier.nama}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {p.items.map(i => `${i.product.nama} (${i.jumlah})`).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{formatRupiah(p.total)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${p.sisaHutang > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatRupiah(p.sisaHutang)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status !== 'LUNAS' && (
                          <button
                            onClick={() => { setSelectedPembelian(p); setBayarAmount(String(p.sisaHutang)); setIsBayarOpen(true); }}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100"
                          >
                            <CreditCard className="w-3 h-3" /> Bayar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Form Catat Pembelian ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Catat Pembelian</h2>
              <button onClick={() => setIsFormOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">

              {/* Supplier & Tanggal */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                  <input type="date" value={formData.tanggal} onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Tambah Item */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Tambah Produk</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select value={selectedProductId} onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const p = products.find(p => p.id === e.target.value);
                    if (p) setItemHarga(String(p.hargaBeli || 0));
                  }}
                    className="col-span-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                    <option value="">-- Produk --</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nama}</option>)}
                  </select>
                  <Input type="number" placeholder="Jumlah" value={itemJumlah} onChange={(e) => setItemJumlah(e.target.value)} />
                  <Input type="number" placeholder="Harga Beli" value={itemHarga} onChange={(e) => setItemHarga(e.target.value)} />
                </div>
                <Button size="sm" onClick={addItem} variant="outline">
                  <Plus className="w-4 h-4 mr-1" /> Tambah ke Daftar
                </Button>
              </div>

              {/* Daftar Item */}
              {items.length > 0 && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-gray-600 font-medium">Produk</th>
                        <th className="text-center px-4 py-2 text-gray-600 font-medium">Jml</th>
                        <th className="text-right px-4 py-2 text-gray-600 font-medium">Harga</th>
                        <th className="text-right px-4 py-2 text-gray-600 font-medium">Subtotal</th>
                        <th className="px-2 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item) => (
                        <tr key={item.productId}>
                          <td className="px-4 py-2">{item.productName}</td>
                          <td className="px-4 py-2 text-center">{item.jumlah}</td>
                          <td className="px-4 py-2 text-right">{formatRupiah(item.hargaBeli)}</td>
                          <td className="px-4 py-2 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => removeItem(item.productId)} className="text-red-400 hover:text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td colSpan={3} className="px-4 py-2 text-right">Total</td>
                        <td className="px-4 py-2 text-right text-blue-600">{formatRupiah(total)}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pembayaran */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dibayar Sekarang (Rp)</label>
                  <Input type="number" placeholder="0 = hutang semua" value={formData.dibayar}
                    onChange={(e) => setFormData({ ...formData, dibayar: e.target.value })} />
                  {formData.dibayar && (
                    <p className="text-xs text-gray-500 mt-1">
                      Sisa hutang: {formatRupiah(Math.max(0, total - parseFloat(formData.dibayar)))}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                  <Input value={formData.keterangan} onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                    placeholder="Opsional" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1">Batal</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  {saving ? 'Menyimpan...' : `Simpan & Update Stok`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Bayar Hutang ── */}
      <Modal isOpen={isBayarOpen} onClose={() => setIsBayarOpen(false)} title="Bayar Hutang">
        {selectedPembelian && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Supplier: <span className="font-medium text-gray-800">{selectedPembelian.supplier.nama}</span></p>
              <p className="text-gray-500 mt-1">Total: <span className="font-medium">{formatRupiah(selectedPembelian.total)}</span></p>
              <p className="text-gray-500 mt-1">Sudah dibayar: <span className="font-medium">{formatRupiah(selectedPembelian.dibayar)}</span></p>
              <p className="text-red-600 font-semibold mt-1">Sisa hutang: {formatRupiah(selectedPembelian.sisaHutang)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Bayar (Rp)</label>
              <Input type="number" value={bayarAmount} onChange={(e) => setBayarAmount(e.target.value)}
                placeholder={String(selectedPembelian.sisaHutang)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsBayarOpen(false)} className="flex-1">Batal</Button>
              <Button onClick={handleBayar} disabled={saving} className="flex-1">
                {saving ? 'Memproses...' : 'Bayar Hutang'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </ProtectedRoute>
  );
}