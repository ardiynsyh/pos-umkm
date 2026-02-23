'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/format';
import {
  DollarSign, ShoppingBag, TrendingUp, Calendar,
  Download, Filter, ChevronDown, ChevronUp,
  Store, Smartphone,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TransactionItem {
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  source: 'kasir' | 'customer';
  total: number;
  paymentMethod: string;
  cashierName: string;
  customerName: string;
  tableInfo: string;
  paymentAmount: number;
  change: number;
  createdAt: string;
  items: TransactionItem[];
}

interface Stats {
  totalRevenue: number;
  totalTransactions: number;
  averageTransaction: number;
  todayRevenue: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const paymentLabel = (method: string) => {
  const map: Record<string, string> = {
    cash: 'Tunai', card: 'Kartu', qris: 'QRIS',
    transfer: 'Transfer', ewallet: 'E-Wallet',
  };
  return map[method] || method;
};

const paymentColor = (method: string) => {
  const map: Record<string, string> = {
    cash: 'bg-green-100 text-green-800',
    card: 'bg-blue-100 text-blue-800',
    qris: 'bg-purple-100 text-purple-800',
    transfer: 'bg-indigo-100 text-indigo-800',
    ewallet: 'bg-orange-100 text-orange-800',
  };
  return map[method] || 'bg-gray-100 text-gray-800';
};

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function LaporanPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0, totalTransactions: 0,
    averageTransaction: 0, todayRevenue: 0,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading,      setLoading]      = useState(true);
  const [exporting,    setExporting]    = useState(false);
  const [filter, setFilter] = useState<'today' | 'week' | 'month' | 'all' | 'custom'>('today');

  const now = new Date();
  const [customDay,   setCustomDay]   = useState('');
  const [customMonth, setCustomMonth] = useState(String(now.getMonth() + 1));
  const [customYear,  setCustomYear]  = useState(String(now.getFullYear()));

  const yearOptions  = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);
  const daysInMonth  = customMonth && customYear
    ? new Date(parseInt(customYear), parseInt(customMonth), 0).getDate() : 31;
  const dayOptions   = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (filter === 'custom') {
        if (customDay)   params.set('day',   customDay);
        if (customMonth) params.set('month', customMonth);
        if (customYear)  params.set('year',  customYear);
      }
      const res  = await fetch(`/api/laporan?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal fetch');
      const data = await res.json();
      setTransactions(data.transactions);
      setStats(data.stats);
    } catch (err) {
      console.error('Gagal memuat laporan:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, customDay, customMonth, customYear]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Export Excel ────────────────────────────────────────────────────────────
  const exportToExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ filter });
      if (filter === 'custom') {
        if (customDay)   params.set('day',   customDay);
        if (customMonth) params.set('month', customMonth);
        if (customYear)  params.set('year',  customYear);
      }
      const res = await fetch(`/api/laporan/export?${params.toString()}`);
      if (!res.ok) throw new Error('Gagal export');

      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href         = url;
      a.download     = `laporan-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export gagal:', err);
      alert('Gagal export. Pastikan library exceljs sudah terinstall.');
    } finally {
      setExporting(false);
    }
  };

  const customLabel = filter === 'custom'
    ? [customDay || null, customMonth ? MONTHS[parseInt(customMonth) - 1] : null, customYear]
        .filter(Boolean).join(' ')
    : '';

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Laporan Penjualan</h1>
            <button
              onClick={exportToExcel}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors text-sm font-medium"
            >
              {exporting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exporting ? 'Mengexport...' : 'Export Excel'}
            </button>
          </div>

          {/* ── Filter Tabs ───────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { key: 'today',  label: 'Hari Ini' },
              { key: 'week',   label: '7 Hari' },
              { key: 'month',  label: '30 Hari' },
              { key: 'all',    label: 'Semua' },
              { key: 'custom', label: <span className="flex items-center gap-1"><Filter className="w-3 h-3" /> Pilih Tanggal</span> },
            ].map(item => (
              <button key={item.key}
                onClick={() => setFilter(item.key as typeof filter)}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${
                  filter === item.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ── Custom Date Picker ────────────────────────────────────────── */}
          {filter === 'custom' && (
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-blue-100">
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Filter Berdasarkan Tanggal
              </p>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Tanggal <span className="text-gray-400">(opsional)</span></label>
                  <select value={customDay} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCustomDay(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[90px]">
                    <option value="">Semua</option>
                    {dayOptions.map(d => <option key={d} value={String(d)}>{d}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Bulan</label>
                  <select value={customMonth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setCustomMonth(e.target.value); setCustomDay(''); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]">
                    {MONTHS.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500 font-medium">Tahun</label>
                  <select value={customYear} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setCustomYear(e.target.value); setCustomDay(''); }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]">
                    {yearOptions.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>
                {customDay && (
                  <button onClick={() => setCustomDay('')}
                    className="px-3 py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Reset Tanggal
                  </button>
                )}
              </div>
              <p className="mt-3 text-xs text-blue-600 font-medium">
                📅 Menampilkan: {customLabel || 'Pilih bulan & tahun'}
                {' '}— <span className="text-gray-500">{transactions.length} transaksi ditemukan</span>
              </p>
            </div>
          )}

          {/* ── Stats Cards ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[
              { label: 'Total Pendapatan',   value: formatCurrency(stats.totalRevenue),      icon: DollarSign,  color: 'bg-blue-100 text-blue-600' },
              { label: 'Total Transaksi',    value: String(stats.totalTransactions),          icon: ShoppingBag, color: 'bg-green-100 text-green-600' },
              { label: 'Rata-rata Transaksi',value: formatCurrency(stats.averageTransaction), icon: TrendingUp,  color: 'bg-purple-100 text-purple-600' },
              { label: 'Hari Ini',           value: formatCurrency(stats.todayRevenue),       icon: Calendar,    color: 'bg-orange-100 text-orange-600' },
            ].map(s => (
              <Card key={s.label}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-800">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${s.color}`}>
                    <s.icon className="w-6 h-6" />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* ── Tabel Transaksi ───────────────────────────────────────────── */}
          <Card title="Riwayat Transaksi">
            <p className="text-xs text-gray-400 mb-3">
              Klik baris transaksi untuk melihat detail produk •
              <span className="inline-flex items-center gap-1 ml-2"><Store className="w-3 h-3" /> = Kasir</span>
              <span className="inline-flex items-center gap-1 ml-2"><Smartphone className="w-3 h-3" /> = Customer Order</span>
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="w-8 px-2 py-3" />
                    {['No. Transaksi','Sumber','Tanggal','Kasir / Meja','Item','Total','Pembayaran'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Memuat data...
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Tidak ada transaksi</td>
                    </tr>
                  ) : transactions.map(transaction => {
                    const isExpanded = expandedRows.has(transaction.id);
                    return (
                      <React.Fragment key={transaction.id}>
                        {/* Main row */}
                        <tr onClick={() => toggleRow(transaction.id)}
                          className="hover:bg-blue-50 cursor-pointer transition-colors">
                          <td className="px-2 py-3 text-center text-gray-400">
                            {isExpanded
                              ? <ChevronUp className="w-4 h-4 mx-auto" />
                              : <ChevronDown className="w-4 h-4 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{transaction.transactionNumber}</td>
                          <td className="px-4 py-3 text-sm">
                            {transaction.source === 'customer' ? (
                              <span className="flex items-center gap-1 text-orange-600"><Smartphone className="w-3 h-3" /> Customer</span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-600"><Store className="w-3 h-3" /> Kasir</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(transaction.createdAt).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {transaction.source === 'customer'
                              ? `${transaction.tableInfo || '-'} · ${transaction.customerName || 'Customer'}`
                              : transaction.cashierName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{transaction.items.length} item</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(transaction.total)}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentColor(transaction.paymentMethod)}`}>
                              {paymentLabel(transaction.paymentMethod)}
                            </span>
                          </td>
                        </tr>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <tr className="bg-blue-50">
                            <td colSpan={8} className="px-6 py-3">
                              <div className="rounded-lg overflow-hidden border border-blue-100">
                                <table className="w-full text-sm">
                                  <thead className="bg-blue-100">
                                    <tr>
                                      {['Produk','Qty','Harga Satuan','Subtotal'].map((h, i) => (
                                        <th key={h} className={`px-4 py-2 text-xs font-semibold text-blue-700 ${i === 0 ? 'text-left' : i === 1 ? 'text-center' : 'text-right'}`}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-100">
                                    {transaction.items.map((item, i) => (
                                      <tr key={i}>
                                        <td className="px-4 py-2 font-medium text-gray-800">{item.productName}</td>
                                        <td className="px-4 py-2 text-center text-gray-600">{item.quantity}</td>
                                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(item.price)}</td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-800">{formatCurrency(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                      <td colSpan={3} className="px-4 py-2 text-right text-sm font-bold text-gray-700">Total</td>
                                      <td className="px-4 py-2 text-right text-sm font-bold text-blue-600">{formatCurrency(transaction.total)}</td>
                                    </tr>
                                    {transaction.paymentMethod === 'cash' && transaction.change > 0 && (
                                      <>
                                        <tr>
                                          <td colSpan={3} className="px-4 py-1 text-right text-xs text-gray-500">Bayar</td>
                                          <td className="px-4 py-1 text-right text-xs text-gray-600">{formatCurrency(transaction.paymentAmount)}</td>
                                        </tr>
                                        <tr>
                                          <td colSpan={3} className="px-4 py-1 text-right text-xs text-gray-500">Kembalian</td>
                                          <td className="px-4 py-1 text-right text-xs font-semibold text-green-600">{formatCurrency(transaction.change)}</td>
                                        </tr>
                                      </>
                                    )}
                                  </tfoot>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

        </div>
      </div>
    </ProtectedRoute>
  );
}