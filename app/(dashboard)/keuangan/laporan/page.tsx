// PATH: app/keuangan/laporan/page.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { useAuthStore } from '@/lib/store/authStore';
import {
  TrendingUp, ShoppingCart, DollarSign, Calendar,
  ChevronDown, Receipt, User, Table, ArrowUpRight,
  ArrowDownRight, BarChart2, Wallet, Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TransactionItem {
  productName: string;
  quantity:    number;
  price:       number;
  subtotal:    number;
}

interface Transaction {
  id:                string;
  transactionNumber: string;
  source:            'kasir' | 'customer';
  total:             number;
  paymentMethod:     string;
  cashierName:       string;
  customerName:      string;
  tableInfo:         string;
  paymentAmount:     number;
  change:            number;
  createdAt:         string;
  items:             TransactionItem[];
}

interface KeuanganSummary {
  totalPendapatan:       number;
  totalPengeluaran:      number;
  totalPembelianStok:    number;
  totalBiayaOperasional: number;
  labaKotor:             number;
  labaBersih:            number;
}

interface Stats {
  totalRevenue:       number;
  totalTransactions:  number;
  averageTransaction: number;
  todayRevenue:       number;
}

interface PengeluaranItem {
  id:         string;
  tanggal:    string;
  kategori:   string;
  keterangan: string;
  jumlah:     number;
  source:     'manual' | 'pembelian';
}

interface LaporanData {
  transactions:          Transaction[];
  stats:                 Stats;
  keuangan:              KeuanganSummary;
  pengeluaranList:       PengeluaranItem[];
  pengeluaranPerKategori: Record<string, number>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatRupiah = (v: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const todayISO = () => new Date().toISOString().slice(0, 10);

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Tunai', card: 'Kartu', qris: 'QRIS', transfer: 'Transfer', ewallet: 'E-Wallet',
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'red' }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    red:    'bg-red-50 text-red-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    pink:   'bg-pink-50 text-pink-600',
  };
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function TransactionRow({ tx, expanded, onToggle }: {
  tx: Transaction; expanded: boolean; onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
          {format(new Date(tx.createdAt), 'd MMM yyyy, HH:mm', { locale: id })}
        </td>
        <td className="px-4 py-3">
          <span className="text-xs font-mono text-gray-600">{tx.transactionNumber}</span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell">
          <span className={`text-xs px-2 py-0.5 rounded-full ${tx.source === 'kasir' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
            {tx.source === 'kasir' ? '🖥 Kasir' : '📱 Customer'}
          </span>
        </td>
        <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-600">
          {tx.cashierName}
        </td>
        <td className="px-4 py-3 hidden md:table-cell">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {PAYMENT_LABELS[tx.paymentMethod] ?? tx.paymentMethod}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-semibold text-gray-800">
          {formatRupiah(tx.total)}
        </td>
        <td className="px-4 py-3 text-center">
          <ChevronDown className={`w-4 h-4 text-gray-400 mx-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50">
          <td colSpan={7} className="px-6 py-3">
            <div className="text-xs text-gray-700 space-y-1">
              {tx.tableInfo && <p className="text-gray-500 flex items-center gap-1"><Table className="w-3 h-3" /> Meja: {tx.tableInfo}</p>}
              {tx.customerName && <p className="text-gray-500 flex items-center gap-1"><User className="w-3 h-3" /> Pelanggan: {tx.customerName}</p>}
              <div className="mt-2 border rounded-lg overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-3 py-1.5 text-gray-600">Produk</th>
                      <th className="text-center px-3 py-1.5 text-gray-600">Qty</th>
                      <th className="text-right px-3 py-1.5 text-gray-600">Harga</th>
                      <th className="text-right px-3 py-1.5 text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tx.items.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-1.5">{item.productName}</td>
                        <td className="px-3 py-1.5 text-center">{item.quantity}</td>
                        <td className="px-3 py-1.5 text-right">{formatRupiah(item.price)}</td>
                        <td className="px-3 py-1.5 text-right font-medium">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-3 py-1.5 text-right font-semibold">Total</td>
                      <td className="px-3 py-1.5 text-right font-bold text-red-600">{formatRupiah(tx.total)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-1 text-right text-gray-500">Bayar</td>
                      <td className="px-3 py-1 text-right text-gray-600">{formatRupiah(tx.paymentAmount)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-3 py-1 text-right text-gray-500">Kembalian</td>
                      <td className="px-3 py-1 text-right text-gray-600">{formatRupiah(tx.change)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LaporanPage() {
  const user = useAuthStore(state => state.user);

  const [data,       setData]       = useState<LaporanData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customMonth, setCustomMonth] = useState(todayISO().slice(0, 7));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<'transaksi' | 'keuangan' | 'pengeluaran'>('transaksi');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/laporan?filter=${filter}`;
      if (filter === 'custom') {
        const [yr, mo] = customMonth.split('-');
        url += `&month=${mo}&year=${yr}`;
      }
      const res  = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Gagal fetch laporan', err);
    } finally {
      setLoading(false);
    }
  }, [filter, customMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filterLabel = {
    today:  'Hari Ini',
    week:   '7 Hari Terakhir',
    month:  '30 Hari Terakhir',
    custom: 'Bulan Tertentu',
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-red-500" /> Laporan Keuangan
              </h1>
              <p className="text-sm text-gray-500 mt-1">Ringkasan transaksi & keuangan toko</p>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-5 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Periode:
            </span>
            <div className="flex flex-wrap gap-2">
              {(['today', 'week', 'month', 'custom'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {filterLabel[f]}
                </button>
              ))}
            </div>
            {filter === 'custom' && (
              <input type="month" value={customMonth} onChange={e => setCustomMonth(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400" />
            )}
            <button onClick={fetchData} className="ml-auto bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="text-center py-20 text-gray-400">Gagal memuat data</div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                <StatCard icon={<DollarSign className="w-4 h-4" />}  label="Total Pendapatan"   value={formatRupiah(data.stats.totalRevenue)}       color="green"  />
                <StatCard icon={<ShoppingCart className="w-4 h-4" />} label="Total Transaksi"    value={`${data.stats.totalTransactions} trx`}        color="blue"   />
                <StatCard icon={<TrendingUp className="w-4 h-4" />}   label="Rata-rata Transaksi" value={formatRupiah(data.stats.averageTransaction)}  color="purple" />
                <StatCard icon={<Receipt className="w-4 h-4" />}      label="Pendapatan Hari Ini" value={formatRupiah(data.stats.todayRevenue)}        color="red"    />
              </div>

              {/* Keuangan Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
                <div className="bg-green-50 rounded-xl p-4 flex items-center gap-3">
                  <ArrowUpRight className="w-8 h-8 text-green-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Laba Kotor</p>
                    <p className="text-base font-bold text-green-600">{formatRupiah(data.keuangan.labaKotor)}</p>
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                  <Wallet className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Laba Bersih</p>
                    <p className="text-base font-bold text-emerald-600">{formatRupiah(data.keuangan.labaBersih)}</p>
                  </div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 flex items-center gap-3">
                  <ArrowDownRight className="w-8 h-8 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total Pengeluaran</p>
                    <p className="text-base font-bold text-red-600">{formatRupiah(data.keuangan.totalPengeluaran)}</p>
                  </div>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 flex items-center gap-3">
                  <Package className="w-8 h-8 text-orange-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Pembelian Stok</p>
                    <p className="text-base font-bold text-orange-600">{formatRupiah(data.keuangan.totalPembelianStok)}</p>
                  </div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 flex items-center gap-3">
                  <Receipt className="w-8 h-8 text-pink-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Biaya Operasional</p>
                    <p className="text-base font-bold text-pink-600">{formatRupiah(data.keuangan.totalBiayaOperasional)}</p>
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                  <DollarSign className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Total Pendapatan</p>
                    <p className="text-base font-bold text-blue-600">{formatRupiah(data.keuangan.totalPendapatan)}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-white rounded-xl border border-gray-100 shadow-sm p-1 mb-4">
                {[
                  { key: 'transaksi',   label: `Transaksi (${data.transactions.length})` },
                  { key: 'pengeluaran', label: `Pengeluaran (${data.pengeluaranList.length})` },
                  { key: 'keuangan',    label: 'Ringkasan Keuangan' },
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key as typeof activeTab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.key ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Transaksi */}
              {activeTab === 'transaksi' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {data.transactions.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Tidak ada transaksi pada periode ini</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b">
                          <tr>
                            <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs">Waktu</th>
                            <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs">No. Transaksi</th>
                            <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs hidden sm:table-cell">Sumber</th>
                            <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs hidden sm:table-cell">Kasir</th>
                            <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs hidden md:table-cell">Pembayaran</th>
                            <th className="text-right px-4 py-3 text-gray-600 font-medium text-xs">Total</th>
                            <th className="px-4 py-3 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.transactions.map(tx => (
                            <TransactionRow
                              key={tx.id}
                              tx={tx}
                              expanded={expandedId === tx.id}
                              onToggle={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                            />
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t">
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total Pendapatan</td>
                            <td className="px-4 py-3 text-right font-black text-green-600">{formatRupiah(data.stats.totalRevenue)}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Pengeluaran */}
              {activeTab === 'pengeluaran' && (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {data.pengeluaranList.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">Tidak ada pengeluaran pada periode ini</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs">Tanggal</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs">Kategori</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium text-xs hidden sm:table-cell">Keterangan</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium text-xs">Jumlah</th>
                          <th className="text-center px-4 py-3 text-gray-600 font-medium text-xs">Sumber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.pengeluaranList.map((item, idx) => (
                          <tr key={`${item.source}-${item.id}-${idx}`} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap text-xs">
                              {format(new Date(item.tanggal), 'd MMM yyyy', { locale: id })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${item.source === 'pembelian' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                {item.kategori}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 hidden sm:table-cell text-xs">{item.keterangan}</td>
                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatRupiah(item.jumlah)}</td>
                            <td className="px-4 py-3 text-center">
                              {item.source === 'pembelian'
                                ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Auto</span>
                                : <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Manual</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t">
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-700">Total Pengeluaran</td>
                          <td className="px-4 py-3 text-right font-black text-red-600">
                            {formatRupiah(data.pengeluaranList.reduce((s, i) => s + i.jumlah, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}

              {/* Tab: Ringkasan Keuangan */}
              {activeTab === 'keuangan' && (
                <div className="space-y-4">
                  {/* Ringkasan per Kategori Pengeluaran */}
                  {Object.keys(data.pengeluaranPerKategori).length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm p-5">
                      <h2 className="text-sm font-semibold text-gray-700 mb-4">Pengeluaran per Kategori</h2>
                      <div className="space-y-3">
                        {Object.entries(data.pengeluaranPerKategori)
                          .sort((a, b) => b[1] - a[1])
                          .map(([kat, total]) => {
                            const pct = data.keuangan.totalPengeluaran > 0
                              ? Math.round((total / data.keuangan.totalPengeluaran) * 100) : 0;
                            return (
                              <div key={kat}>
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>{kat}</span>
                                  <span className="font-semibold">{formatRupiah(total)} <span className="text-gray-400">({pct}%)</span></span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Tabel ringkasan akhir */}
                  <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full text-sm">
                      <tbody>
                        {[
                          { label: 'Total Pendapatan',       value: data.keuangan.totalPendapatan,       color: 'text-green-600' },
                          { label: 'HPP / Pembelian Stok',   value: -data.keuangan.totalPembelianStok,   color: 'text-orange-600' },
                          { label: 'Laba Kotor',             value: data.keuangan.labaKotor,             color: 'text-green-700 font-bold' },
                          { label: 'Biaya Operasional',      value: -data.keuangan.totalBiayaOperasional, color: 'text-pink-600' },
                          { label: 'Laba Bersih',            value: data.keuangan.labaBersih,            color: `font-black text-lg ${data.keuangan.labaBersih >= 0 ? 'text-emerald-600' : 'text-red-600'}` },
                        ].map((row, i) => (
                          <tr key={i} className={`border-b last:border-0 ${i === 4 ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                            <td className="px-5 py-3 text-gray-600 text-sm">{row.label}</td>
                            <td className={`px-5 py-3 text-right ${row.color}`}>{formatRupiah(Math.abs(row.value))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
