'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronLeft,
  CheckCircle2, Clock, ChefHat, Bell, Search, X,
  Banknote, CreditCard, QrCode, Wallet,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: string;
  totalAmount: number;
  items: { productName: string; quantity: number; price: number; subtotal: number }[];
  createdAt: string;
}

type Step = 'menu' | 'cart' | 'checkout' | 'status';

// ─── Metode Pembayaran ────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  {
    key: 'cash',
    label: 'Bayar di Kasir',
    sublabel: 'Tunai / Cash',
    icon: Banknote,
    color: 'border-green-300 bg-green-50 text-green-700',
    activeColor: 'border-green-500 bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    key: 'qris',
    label: 'QRIS',
    sublabel: 'Scan QR di kasir',
    icon: QrCode,
    color: 'border-blue-300 bg-blue-50 text-blue-700',
    activeColor: 'border-blue-500 bg-blue-100',
    iconColor: 'text-blue-600',
  },
  {
    key: 'transfer',
    label: 'Transfer Bank',
    sublabel: 'BCA / Mandiri / BNI / BRI',
    icon: CreditCard,
    color: 'border-purple-300 bg-purple-50 text-purple-700',
    activeColor: 'border-purple-500 bg-purple-100',
    iconColor: 'text-purple-600',
  },
  {
    key: 'ewallet',
    label: 'E-Wallet',
    sublabel: 'GoPay / OVO / Dana / ShopeePay',
    icon: Wallet,
    color: 'border-orange-300 bg-orange-50 text-orange-700',
    activeColor: 'border-orange-500 bg-orange-100',
    iconColor: 'text-orange-600',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const STATUS_CONFIG = {
  PENDING:    { label: 'Pesanan Diterima',  icon: Bell,         color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  PROCESSING: { label: 'Sedang Diproses',   icon: ChefHat,      color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  READY:      { label: 'Siap Disajikan',    icon: CheckCircle2, color: 'text-green-500',  bg: 'bg-green-50',  border: 'border-green-200' },
  COMPLETED:  { label: 'Selesai',           icon: CheckCircle2, color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  CANCELLED:  { label: 'Dibatalkan',        icon: X,            color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-200' },
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: '💵 Bayar di Kasir (Tunai)',
  qris: '📱 QRIS',
  transfer: '🏦 Transfer Bank',
  ewallet: '💳 E-Wallet',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CustomerOrderPage() {
  const params = useParams();
  const tableId = params.tableId as string;

  const [step, setStep] = useState<Step>('menu');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableInfo, setTableInfo] = useState<{ number: number; label: string } | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('cash');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

// GANTI BAGIAN INI (dari baris loadData hingga sebelum pollOrder)
useEffect(() => {
  const loadData = async () => {
    try {
      const tableRes = await fetch(`/api/public/tables/${tableId}`);
      if (!tableRes.ok) throw new Error('Meja tidak ditemukan');
      const tableData = await tableRes.json();
      setTableInfo(tableData);

      const prodRes = await fetch(`/api/public/products?outletId=${tableData.outletId}`);
      const prodData = await prodRes.json();
      setProducts(prodData);

      const cats = ['Semua', ...Array.from(new Set<string>(
        prodData.map((p: Product) => p.category || 'Lainnya')
      ))];
      setCategories(cats);
    } catch {
      setError('Gagal memuat data. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  };

  loadData(); // ← INI YANG HILANG, harus dipanggil di dalam useEffect
}, [tableId]); // ← dependency tableId

  // Polling status order setiap 5 detik
  const pollOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/public/orders/${orderId}`);
      const data = await res.json();
      setOrder(data);
    } catch {}
  }, [orderId]);

  useEffect(() => {
    if (step !== 'status' || !orderId) return;
    pollOrder();
    const interval = setInterval(pollOrder, 5000);
    return () => clearInterval(interval);
  }, [step, orderId, pollOrder]);

  // ─── Cart logic ──────────────────────────────────────────────────────────────
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => i.id === id ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  // ─── Filter produk ────────────────────────────────────────────────────────────
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'Semua' || (p.category || 'Lainnya') === selectedCategory;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  // ─── Submit order ─────────────────────────────────────────────────────────────
  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableId,
          customerName: customerName.trim() || 'Customer',
          paymentMethod: selectedPayment,
          items: cart.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal membuat pesanan');
      }

      const data = await res.json();
      setOrderId(data.orderId);
      setStep('status');
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Memuat menu...</p>
        </div>
      </div>
    );
  }

  if (error && step !== 'checkout') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-orange-500 text-white px-6 py-2 rounded-full text-sm">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">

      {/* ── HEADER ── */}
      <div className="bg-orange-500 text-white px-4 pt-10 pb-6 sticky top-0 z-10 shadow">
        <div className="flex items-center gap-3">
          {step !== 'menu' && step !== 'status' && (
            <button
              onClick={() => setStep(step === 'cart' ? 'menu' : 'cart')}
              className="bg-orange-400 rounded-full p-1"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-none">
              {step === 'menu' && `Menu — ${tableInfo?.label || 'Meja'}`}
              {step === 'cart' && 'Keranjang'}
              {step === 'checkout' && 'Checkout'}
              {step === 'status' && 'Status Pesanan'}
            </h1>
            <p className="text-orange-100 text-xs mt-0.5">POS UMKM</p>
          </div>
          {step === 'menu' && (
            <button onClick={() => setStep('cart')} className="relative bg-orange-400 rounded-full p-2">
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          STEP 1: MENU
      ══════════════════════════════════════════ */}
      {step === 'menu' && (
        <div className="pb-28">
          {/* Search */}
          <div className="px-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
            </div>
          </div>

          {/* Kategori */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Produk Grid */}
          <div className="px-4 grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.id === product.id);
              const isOutOfStock = product.stock <= 0;
              return (
                <div key={product.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isOutOfStock ? 'opacity-60' : ''}`}>
                  <div className="bg-orange-50 h-28 flex items-center justify-center text-4xl">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : '🍽️'}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm leading-tight">{product.name}</p>
                    <p className="text-orange-500 font-bold text-sm mt-1">{formatRupiah(product.price)}</p>
                    {isOutOfStock ? (
                      <span className="text-xs text-red-400 mt-1 block">Stok habis</span>
                    ) : cartItem ? (
                      <div className="flex items-center justify-between mt-2">
                        <button onClick={() => updateQty(product.id, -1)}
                          className="bg-orange-100 text-orange-600 rounded-full w-7 h-7 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(product)}
                          className="bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => addToCart(product)}
                        className="mt-2 w-full bg-orange-500 text-white rounded-xl py-1.5 text-xs font-medium">
                        + Tambah
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 2: CART
      ══════════════════════════════════════════ */}
      {step === 'cart' && (
        <div className="pb-28 px-4 pt-4">
          {cart.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Keranjang masih kosong</p>
              <button onClick={() => setStep('menu')} className="mt-4 text-orange-500 text-sm font-medium">
                Lihat Menu →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="bg-orange-50 rounded-xl w-14 h-14 flex items-center justify-center text-2xl flex-shrink-0">
                    🍽️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-orange-500 text-xs font-medium">{formatRupiah(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(item.id, -1)}
                      className="bg-orange-100 text-orange-600 rounded-full w-7 h-7 flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => addToCart(item)}
                      className="bg-orange-500 text-white rounded-full w-7 h-7 flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-400 ml-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 3: CHECKOUT
      ══════════════════════════════════════════ */}
      {step === 'checkout' && (
        <div className="pb-28 px-4 pt-4 space-y-4">

          {/* Nama Customer */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="text-sm font-semibold text-gray-700 block mb-2">Nama Kamu (opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Budi"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Ringkasan Order */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Ringkasan Pesanan</h3>
            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.name} x{item.quantity}</span>
                  <span className="font-medium">{formatRupiah(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-orange-500">{formatRupiah(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Info Meja */}
          <div className="bg-orange-50 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-sm text-gray-600">Meja</span>
            <span className="font-bold text-orange-600">{tableInfo?.label}</span>
          </div>

          {/* ── Pilih Metode Pembayaran ── */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3">Metode Pembayaran</h3>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedPayment === method.key;
                return (
                  <button
                    key={method.key}
                    onClick={() => setSelectedPayment(method.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                      isSelected ? method.activeColor + ' border-opacity-100' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-white' : 'bg-white'}`}>
                      <Icon className={`w-5 h-5 ${isSelected ? method.iconColor : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isSelected ? '' : 'text-gray-700'}`}>{method.label}</p>
                      <p className={`text-xs ${isSelected ? 'opacity-70' : 'text-gray-400'}`}>{method.sublabel}</p>
                    </div>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-current bg-current' : 'border-gray-300'
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {/* Tombol Pesan */}
          <button
            disabled={submitting}
            onClick={handleSubmitOrder}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 font-semibold text-sm disabled:opacity-60 transition-colors"
          >
            {submitting ? 'Memproses...' : `Pesan Sekarang — ${formatRupiah(totalPrice)}`}
          </button>

          <p className="text-center text-xs text-gray-400">
            Pembayaran dilakukan sesuai metode yang dipilih
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          STEP 4: STATUS
      ══════════════════════════════════════════ */}
      {step === 'status' && (
        <div className="pb-10 px-4 pt-6 space-y-4">
          {!order ? (
            <div className="text-center py-10">
              <div className="w-10 h-10 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Memuat status pesanan...</p>
            </div>
          ) : (
            <>
              {/* Status Badge */}
              {(() => {
                const cfg = STATUS_CONFIG[order.status];
                const Icon = cfg.icon;
                return (
                  <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-6 text-center`}>
                    <Icon className={`w-12 h-12 ${cfg.color} mx-auto mb-3`} />
                    <p className="font-bold text-lg text-gray-800">{cfg.label}</p>
                    <p className="text-gray-500 text-sm mt-1">#{order.orderNumber}</p>
                  </div>
                );
              })()}

              {/* Progress */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-4 text-sm">Progress Pesanan</h3>
                {(['PENDING', 'PROCESSING', 'READY', 'COMPLETED'] as const).map((s, i) => {
                  const isDone = ['PENDING', 'PROCESSING', 'READY', 'COMPLETED'].indexOf(order.status) >= i;
                  return (
                    <div key={s} className="flex items-center gap-3 mb-3 last:mb-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDone ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {i + 1}
                      </div>
                      <span className={`text-sm ${isDone ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                        {STATUS_CONFIG[s].label}
                      </span>
                      {order.status === s && s !== 'COMPLETED' && (
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse ml-auto" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detail Items */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Detail Pesanan</h3>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="text-gray-600">{item.productName} x{item.quantity}</span>
                    <span className="font-medium">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-sm mt-2 pt-2">
                  <span>Total</span>
                  <span className="text-orange-500">{formatRupiah(order.totalAmount)}</span>
                </div>
              </div>

              {/* Metode & Status Bayar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500">Metode Pembayaran</span>
                  <span className="text-sm font-semibold">{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
                </div>
                <div className={`text-center py-3 rounded-xl ${order.paymentStatus === 'PAID' ? 'bg-green-50' : 'bg-yellow-50'}`}>
                  <p className={`font-semibold text-sm ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.paymentStatus === 'PAID' ? '✅ Pembayaran Dikonfirmasi' : '⏳ Silakan lakukan pembayaran di kasir'}
                  </p>
                </div>
              </div>

              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Status diperbarui otomatis setiap 5 detik
              </p>
            </>
          )}
        </div>
      )}

      {/* ── BOTTOM BAR ── */}
      {(step === 'menu' || step === 'cart') && cart.length > 0 && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-6 pt-3 bg-white border-t border-gray-100 shadow-lg z-20">
          <button
            onClick={() => setStep(step === 'menu' ? 'cart' : 'checkout')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl py-4 font-semibold flex items-center justify-between px-5"
          >
            <span className="bg-orange-400 rounded-xl px-2.5 py-0.5 text-sm font-bold">{totalItems}</span>
            <span>{step === 'menu' ? 'Lihat Keranjang' : 'Lanjut Checkout'}</span>
            <span className="font-bold">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
