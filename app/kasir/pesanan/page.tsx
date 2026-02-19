'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { Bell, ChefHat, CheckCircle2, X, Clock, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'COMPLETED' | 'CANCELLED';

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: 'UNPAID' | 'PAID';
  paymentMethod: string;
  customerName: string;
  totalAmount: number;
  createdAt: string;
  table: { label: string; number: number };
  items: {
    id: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:    { label: 'Baru Masuk',     color: 'text-yellow-700', bg: 'bg-yellow-50',  border: 'border-yellow-200' },
  PROCESSING: { label: 'Diproses',       color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-200' },
  READY:      { label: 'Siap Saji',      color: 'text-green-700',  bg: 'bg-green-50',   border: 'border-green-200' },
  COMPLETED:  { label: 'Selesai',        color: 'text-gray-600',   bg: 'bg-gray-50',    border: 'border-gray-200' },
  CANCELLED:  { label: 'Dibatalkan',     color: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200' },
};

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING:    'PROCESSING',
  PROCESSING: 'READY',
  READY:      'COMPLETED',
};

const NEXT_STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  PENDING:    'Proses Sekarang',
  PROCESSING: 'Tandai Siap Saji',
  READY:      'Selesaikan',
};

// ─── Komponen kartu order ─────────────────────────────────────────────────────
function OrderCard({ order, onUpdateStatus }: { order: Order; onUpdateStatus: (id: string, status: OrderStatus) => void }) {
  const cfg = STATUS_CONFIG[order.status];
  const nextStatus = NEXT_STATUS[order.status];

  return (
    <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-4 shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800">#{order.orderNumber}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
              {cfg.label}
            </span>
            {order.status === 'PENDING' && (
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>🪑 {order.table.label}</span>
            <span>👤 {order.customerName || 'Customer'}</span>
            <span>🕐 {formatTime(order.createdAt)}</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold text-orange-500">{formatRupiah(order.totalAmount)}</p>
          <span className={`text-xs ${order.paymentStatus === 'PAID' ? 'text-green-600' : 'text-red-500'}`}>
            {order.paymentStatus === 'PAID' ? '✅ Lunas' : '⏳ Belum Bayar'}
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl p-3 mb-3 space-y-1">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              <span className="font-semibold text-orange-500">{item.quantity}x</span> {item.productName}
            </span>
            <span className="text-gray-500">{formatRupiah(item.subtotal)}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {nextStatus && (
          <button
            onClick={() => onUpdateStatus(order.id, nextStatus)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            {NEXT_STATUS_LABEL[order.status]}
          </button>
        )}
        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
          <button
            onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
            className="bg-red-100 hover:bg-red-200 text-red-600 rounded-xl px-3 py-2.5 transition-colors"
            title="Batalkan"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function PesananPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [prevOrderIds, setPrevOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      const data: Order[] = await res.json();

      // Deteksi order baru
      const currentIds = new Set(data.map((o) => o.id));
      const newOnes = data.filter((o) => !prevOrderIds.has(o.id) && o.status === 'PENDING');
      if (newOnes.length > 0 && prevOrderIds.size > 0) {
        setNewOrderCount((n) => n + newOnes.length);
        // Bunyi notifikasi (jika browser support)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🛎️ ${newOnes.length} Pesanan Baru!`, {
            body: newOnes.map((o) => `#${o.orderNumber} - ${o.table.label}`).join('\n'),
          });
        }
      }
      setPrevOrderIds(currentIds);
      setOrders(data);
      setLastUpdate(new Date());
    } catch {}
    finally {
      setLoading(false);
    }
  }, [prevOrderIds]);

  // audio ref for new order sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // play sound when new orders detected
  useEffect(() => {
    if (!audioRef.current) return;
    // if newOrderCount increased, play
    if (newOrderCount > 0) {
      try {
        audioRef.current.currentTime = 0;
        void audioRef.current.play();
      } catch {}
    }
  }, [newOrderCount]);

  // Auto refresh setiap 5 detik
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  // Minta izin notifikasi
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      fetchOrders();
    } catch {}
  };

  // Pisah order aktif dan histori
  const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status));
  const historyOrders = orders.filter((o) => ['COMPLETED', 'CANCELLED'].includes(o.status));

  // Stats
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;
  const todayRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID' && o.status === 'COMPLETED')
    .reduce((s, o) => s + o.totalAmount, 0);

  return (
    <ProtectedRoute>
      <Navbar />
      <audio ref={audioRef} src="/sounds/beep.mp3" />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bell className="w-6 h-6 text-orange-500" />
                Pesanan Masuk
                {pendingCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {pendingCount} baru
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Update otomatis · terakhir {formatTime(lastUpdate.toISOString())}
              </p>
            </div>
            <button onClick={() => { setNewOrderCount(0); fetchOrders(); }}
              className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-xs text-yellow-600 mt-1">Menunggu</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{processingCount}</p>
              <p className="text-xs text-blue-600 mt-1">Diproses</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-lg font-bold text-green-600">{formatRupiah(todayRevenue)}</p>
              <p className="text-xs text-green-600 mt-1">Pendapatan</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setActiveTab('active')}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Aktif ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              Riwayat ({historyOrders.length})
            </button>
          </div>

          {/* Orders */}
          {loading ? (
            <div className="text-center py-20 text-gray-400">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Memuat pesanan...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeTab === 'active' ? activeOrders : historyOrders).length === 0 ? (
                <div className="col-span-2 text-center py-16 text-gray-400">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">
                    {activeTab === 'active' ? 'Belum ada pesanan aktif' : 'Belum ada riwayat pesanan'}
                  </p>
                </div>
              ) : (
                (activeTab === 'active' ? activeOrders : historyOrders)
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((order) => (
                    <OrderCard key={order.id} order={order} onUpdateStatus={handleUpdateStatus} />
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
