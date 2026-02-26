'use client';
// app/(dashboard)/operasional/page.tsx

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import {
  ShoppingCart, Package, ClipboardList, Plus, Minus, Trash2,
  Search, Loader2, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';

type Product = {
  id: string; nama: string; hargaJual: number; stok: number;
  satuan: string; foto?: string; category?: { nama: string };
  sku: string; stokMinimal: number;
};
type CartItem = Product & { qty: number };
type Order = {
  id: string; orderNumber: string; status: string;
  totalAmount: number; customerName?: string;
  createdAt: string; isRead: boolean;
  items: { productName: string; quantity: number; price: number }[];
};

const fmt = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
type Tab = 'kasir' | 'produk' | 'pesanan';

// ─── Hook: resolve outletId dengan multi-fallback ─────────────────────────────
function useOutletId() {
  const { user, _hasHydrated } = useAuthStore();
  const [outletId, setOutletId] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!user) {
      setError('Belum login');
      setLoading(false);
      return;
    }

    // ✅ Langsung pakai dari store jika ada
    if (user.outletId) {
      setOutletId(user.outletId);
      setLoading(false);
      return;
    }

    // ✅ Fallback bertingkat
    const resolve = async () => {
      try {
        // Coba 1: /api/outlets/me
        const r1 = await fetch('/api/outlets/me');
        if (r1.ok) {
          const d1 = await r1.json();
          const id = d1.outlet?.id ?? d1.outlets?.[0]?.id ?? null;
          if (id) { setOutletId(id); setLoading(false); return; }
        }
      } catch { /* lanjut */ }

      try {
        // Coba 2: /api/outlets (list semua outlet tenant ini)
        const r2 = await fetch('/api/outlets');
        if (r2.ok) {
          const d2 = await r2.json();
          const list = d2.outlets ?? d2 ?? [];
          const id = Array.isArray(list) ? list[0]?.id : null;
          if (id) { setOutletId(id); setLoading(false); return; }
        }
      } catch { /* lanjut */ }

      // Semua fallback gagal
      setError(
        `Akun Anda (${user.email}) belum terhubung ke outlet manapun. ` +
        `Minta Admin untuk mengatur outletId pada akun Anda di menu Users.`
      );
      setLoading(false);
    };

    resolve();
  }, [_hasHydrated, user?.outletId, user?.email]);

  return { outletId, loading, error };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function OperasionalPage() {
  const { user } = useAuthStore();
  const { outletId, loading: outletLoading, error: outletError } = useOutletId();
  const isKasir = user?.role === 'KASIR';
  const [tab, setTab] = useState<Tab>('kasir');

  const tabs = [
    { key: 'kasir'   as Tab, label: 'Kasir',         icon: ShoppingCart },
    { key: 'produk'  as Tab, label: 'Produk & Stok', icon: Package,     hide: isKasir },
    { key: 'pesanan' as Tab, label: 'Pesanan',        icon: ClipboardList },
  ].filter(t => !t.hide);

  if (outletLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <p className="text-sm text-gray-400">Memuat data outlet...</p>
      </div>
    );
  }

  if (outletError || !outletId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3 px-4">
        <AlertCircle className="w-10 h-10 text-orange-400" />
        <p className="text-gray-700 font-semibold">Outlet tidak tersedia</p>
        <p className="text-sm text-gray-500 max-w-sm">
          {outletError ?? 'Akun Anda belum terhubung ke outlet.'}
        </p>
        {/* ✅ Info debug untuk Admin */}
        <div className="mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400 max-w-sm">
          User: {user?.email} · Role: {user?.role} · outletId: {user?.outletId ?? 'null'}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === t.key ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kasir'   && <KasirTab outletId={outletId} user={user} />}
      {tab === 'produk'  && !isKasir && <ProdukTab outletId={outletId} />}
      {tab === 'pesanan' && <PesananTab outletId={outletId} />}
    </div>
  );
}

// ─── TAB KASIR ────────────────────────────────────────────────────────────────
function KasirTab({ outletId, user }: { outletId: string; user: any }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart,     setCart]     = useState<CartItem[]>([]);
  const [search,   setSearch]   = useState('');
  const [loading,  setLoading]  = useState(true);
  const [paying,   setPaying]   = useState(false);
  const [method,   setMethod]   = useState('TUNAI');
  const [paid,     setPaid]     = useState('');
  const [success,  setSuccess]  = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!outletId) return;
    try {
      const r = await fetch(`/api/produk?outletId=${outletId}`);
      const d = await r.json();
      setProducts(d.products ?? []);
    } catch {
      setError('Gagal memuat produk');
    } finally {
      setLoading(false);
    }
  }, [outletId]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const addToCart = (p: Product) => {
    if (p.stok <= 0) return;
    setCart(prev => {
      const exists = prev.find(c => c.id === p.id);
      if (exists) {
        if (exists.qty >= p.stok) return prev;
        return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev
      .map(c => c.id === id ? { ...c, qty: c.qty + delta } : c)
      .filter(c => c.qty > 0)
    );
  };

  const total     = cart.reduce((s, c) => s + c.hargaJual * c.qty, 0);
  const kembalian = Math.max((parseFloat(paid) || 0) - total, 0);

  const handleCheckout = async () => {
    if (!cart.length) return;
    setPaying(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId,
          kasir:            user?.nama,
          metodePembayaran: method,
          uangDibayar:      parseFloat(paid) || total,
          items: cart.map(c => ({
            productId:   c.id,
            namaProduk:  c.nama,
            quantity:    c.qty,
            hargaSatuan: c.hargaJual,
            subtotal:    c.hargaJual * c.qty,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Gagal');
      setSuccess(d.transaction.nomorTransaksi);
      setCart([]);
      setPaid('');
      fetchProducts();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPaying(false);
    }
  };

  const filtered = products.filter(p =>
    p.nama.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex justify-center h-48 items-center">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari produk atau SKU..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(p => (
            <button key={p.id} onClick={() => addToCart(p)} disabled={p.stok <= 0}
              className={`bg-white rounded-2xl border p-3 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95
                ${p.stok <= 0 ? 'opacity-50 cursor-not-allowed border-gray-100' : 'border-gray-100 hover:border-blue-200'}
                ${cart.find(c => c.id === p.id) ? 'border-blue-300 bg-blue-50' : ''}`}
            >
              <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {p.foto
                  ? <img src={p.foto} alt={p.nama} className="w-full h-full object-cover rounded-lg" />
                  : <Package className="w-8 h-8 text-gray-300" />}
              </div>
              <p className="text-sm font-semibold text-gray-800 truncate">{p.nama}</p>
              <p className="text-xs text-blue-600 font-bold mt-0.5">{fmt(p.hargaJual)}</p>
              <p className={`text-xs mt-0.5 ${p.stok <= p.stokMinimal ? 'text-red-500' : 'text-gray-400'}`}>
                Stok: {p.stok} {p.satuan}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Produk tidak ditemukan</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-800">Keranjang ({cart.length})</h3>
        </div>
        {success && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            Transaksi berhasil! #{success}
          </div>
        )}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {cart.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Pilih produk untuk mulai transaksi</p>
            </div>
          )}
          {cart.map(c => (
            <div key={c.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.nama}</p>
                <p className="text-xs text-blue-600">{fmt(c.hargaJual)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(c.id, -1)}
                  className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Minus className="w-3 h-3 text-gray-600" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">{c.qty}</span>
                <button onClick={() => updateQty(c.id, 1)} disabled={c.qty >= c.stok}
                  className="w-7 h-7 flex items-center justify-center bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40">
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
              <p className="text-sm font-bold text-gray-800 w-20 text-right">{fmt(c.hargaJual * c.qty)}</p>
              <button onClick={() => setCart(p => p.filter(x => x.id !== c.id))}
                className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 space-y-3">
            <div className="flex justify-between text-base font-bold text-gray-900">
              <span>Total</span>
              <span className="text-blue-600">{fmt(total)}</span>
            </div>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['TUNAI','QRIS','DEBIT','KREDIT','TRANSFER'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {method === 'TUNAI' && (
              <div className="space-y-1.5">
                <input type="number" value={paid} onChange={e => setPaid(e.target.value)}
                  placeholder="Uang dibayar"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {paid && (
                  <p className="text-xs text-gray-500">Kembalian: <span className="font-semibold text-green-600">{fmt(kembalian)}</span></p>
                )}
              </div>
            )}
            <button onClick={handleCheckout} disabled={paying}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Bayar {fmt(total)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB PRODUK ───────────────────────────────────────────────────────────────
function ProdukTab({ outletId }: { outletId: string }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [showLow,  setShowLow]  = useState(false);

  useEffect(() => {
    if (!outletId) return;
    fetch(`/api/produk?outletId=${outletId}`)
      .then(r => r.json())
      .then(d => { setProducts(d.products ?? []); setLoading(false); });
  }, [outletId]);

  const filtered = products
    .filter(p => !showLow || p.stok <= p.stokMinimal)
    .filter(p => p.nama.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex justify-center h-48 items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari produk..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => setShowLow(s => !s)}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${showLow ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500'}`}>
          Stok Rendah
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>{['Produk','SKU','Harga Jual','Stok','Status'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><p className="font-medium text-gray-800 text-sm">{p.nama}</p><p className="text-xs text-gray-400">{p.category?.nama}</p></td>
                <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.sku}</td>
                <td className="px-4 py-3 text-sm font-semibold text-blue-600">{fmt(p.hargaJual)}</td>
                <td className="px-4 py-3"><span className={`text-sm font-bold ${p.stok <= p.stokMinimal ? 'text-red-500' : 'text-gray-700'}`}>{p.stok} {p.satuan}</span></td>
                <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.stok <= 0 ? 'bg-red-100 text-red-700' : p.stok <= p.stokMinimal ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>{p.stok <= 0 ? 'Habis' : p.stok <= p.stokMinimal ? 'Hampir Habis' : 'Tersedia'}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">Tidak ada produk</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TAB PESANAN ──────────────────────────────────────────────────────────────
function PesananTab({ outletId }: { outletId: string }) {
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!outletId) return;
    const r = await fetch(`/api/orders?outletId=${outletId}`);
    const d = await r.json();
    setOrders(d.orders ?? []);
    setLoading(false);
  }, [outletId]);

  useEffect(() => {
    fetchOrders();
    const iv = setInterval(fetchOrders, 15000);
    return () => clearInterval(iv);
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    await fetch('/api/orders', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchOrders();
    setUpdating(null);
  };

  const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string }> = {
    PENDING:    { label: 'Pending',  color: 'bg-yellow-100 text-yellow-700', next: 'PROCESSING' },
    PROCESSING: { label: 'Diproses',color: 'bg-blue-100 text-blue-700',    next: 'READY' },
    READY:      { label: 'Siap',    color: 'bg-purple-100 text-purple-700', next: 'COMPLETED' },
    COMPLETED:  { label: 'Selesai', color: 'bg-green-100 text-green-700' },
    CANCELLED:  { label: 'Batal',   color: 'bg-red-100 text-red-700' },
  };

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter);

  if (loading) return <div className="flex justify-center h-48 items-center"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL','PENDING','PROCESSING','READY','COMPLETED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
              {s === 'ALL' ? 'Semua' : STATUS_CONFIG[s]?.label}
              {s !== 'ALL' && <span className="ml-1.5">{orders.filter(o => o.status === s).length}</span>}
            </button>
          ))}
        </div>
        <button onClick={fetchOrders} className="text-gray-400 hover:text-blue-500"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(order => {
          const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
          return (
            <div key={order.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!order.isRead ? 'border-blue-300' : 'border-gray-100'}`}>
              <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                <div><p className="font-bold text-gray-800 text-sm">#{order.orderNumber}</p>{order.customerName && <p className="text-xs text-gray-400">{order.customerName}</p>}</div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
              </div>
              <div className="px-4 py-3 space-y-1">
                {order.items.slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{item.quantity}x {item.productName}</span>
                    <span className="font-medium ml-2">{fmt(item.price * item.quantity)}</span>
                  </div>
                ))}
                {order.items.length > 3 && <p className="text-xs text-gray-400">+{order.items.length - 3} lainnya</p>}
              </div>
              <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between">
                <span className="font-bold text-blue-600">{fmt(order.totalAmount)}</span>
                {cfg.next && (
                  <button onClick={() => updateStatus(order.id, cfg.next!)} disabled={updating === order.id}
                    className="text-xs bg-blue-600 text-white font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5">
                    {updating === order.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${STATUS_CONFIG[cfg.next]?.label}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Belum ada pesanan</p>
          </div>
        )}
      </div>
    </div>
  );
}
