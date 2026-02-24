'use client';
// app/(dashboard)/shift/page.tsx

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { Clock, TrendingUp, AlertTriangle, CheckCircle, Loader2, History } from 'lucide-react';

type Shift = {
  id: string; kasirNama: string; openedAt: string; closedAt?: string;
  openingBalance: number; closingBalance?: number; systemBalance?: number;
  difference?: number; notes?: string; status: 'OPEN' | 'CLOSED';
};

const fmt     = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const fmtTime = (d: string) => new Date(d).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

export default function ShiftPage() {
  const { user, _hasHydrated } = useAuthStore();
  const outletId     = user?.outletId ?? '';
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  const [activeShift,    setActiveShift]    = useState<Shift | null>(null);
  const [history,        setHistory]        = useState<Shift[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showHistory,    setShowHistory]    = useState(false);

  // Form buka shift
  const [openingBalance, setOpeningBalance] = useState('');
  const [openingLoading, setOpeningLoading] = useState(false);

  // Form tutup shift
  const [closingBalance, setClosingBalance] = useState('');
  const [closingNotes,   setClosingNotes]   = useState('');
  const [closingLoading, setClosingLoading] = useState(false);
  const [closingResult,  setClosingResult]  = useState<{ salesTotal: number; diff: number } | null>(null);

  const fetchShift = async () => {
    if (!outletId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/shift?outletId=${outletId}`);
      const d = await r.json();
      setActiveShift(d.shift ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!outletId) return;
    try {
      const r = await fetch(`/api/shift?outletId=${outletId}&history=true`);
      const d = await r.json();
      setHistory(d.shifts ?? []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!_hasHydrated) return;

    // SUPERADMIN tanpa outletId → tidak perlu fetch, tampilkan pesan
    if (isSuperAdmin && !outletId) {
      setLoading(false);
      return;
    }

    if (!outletId) return;
    fetchShift();
  }, [outletId, isSuperAdmin, _hasHydrated]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory]);

  const handleOpenShift = async () => {
    setOpeningLoading(true);
    try {
      await fetch('/api/shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outletId, kasirId: user?.id, kasirNama: user?.nama,
          openingBalance: parseFloat(openingBalance) || 0,
        }),
      });
      setOpeningBalance('');
      await fetchShift();
    } catch (e) {
      console.error(e);
    } finally {
      setOpeningLoading(false);
    }
  };

  const handleCloseShift = async () => {
    if (!activeShift) return;
    setClosingLoading(true);
    try {
      const r = await fetch('/api/shift', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift.id,
          closingBalance: parseFloat(closingBalance) || 0,
          notes: closingNotes,
        }),
      });
      const d = await r.json();
      setClosingResult({ salesTotal: d.salesTotal, diff: d.shift.difference });
      setClosingBalance('');
      setClosingNotes('');
      await fetchShift();
    } catch (e) {
      console.error(e);
    } finally {
      setClosingLoading(false);
    }
  };

  // Loading — tunggu rehidrasi selesai
  if (!_hasHydrated || loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  // SUPERADMIN tanpa outlet yang dipilih
  if (isSuperAdmin && !outletId) return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Shift Kasir</h1>
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
        <TrendingUp className="w-10 h-10 text-blue-400 mx-auto mb-3" />
        <p className="text-blue-800 font-semibold mb-1">Pilih Outlet Terlebih Dahulu</p>
        <p className="text-blue-600 text-sm">Sebagai SuperAdmin, silakan pilih outlet spesifik untuk mengelola shift kasir.</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Kasir</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola buka &amp; tutup shift kasir</p>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 border border-gray-200 px-3 py-2 rounded-lg hover:border-blue-300 transition-colors"
        >
          <History className="w-4 h-4" /> Riwayat
        </button>
      </div>

      {/* Status aktif */}
      {activeShift ? (
        <div className="bg-white rounded-2xl border border-green-200 shadow-sm overflow-hidden">
          <div className="bg-green-50 px-6 py-4 flex items-center gap-3 border-b border-green-100">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold text-green-800">Shift Sedang Berjalan</span>
          </div>
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: 'Kasir',      value: activeShift.kasirNama },
              { label: 'Dibuka',     value: fmtTime(activeShift.openedAt) },
              { label: 'Modal Awal', value: fmt(activeShift.openingBalance) },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{s.label}</p>
                <p className="font-semibold text-gray-800 text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Form tutup shift */}
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-semibold text-gray-800">Tutup Shift</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Uang Fisik di Kas (Rp)</label>
              <input
                type="number" value={closingBalance}
                onChange={e => setClosingBalance(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Catatan (opsional)</label>
              <textarea
                value={closingNotes} onChange={e => setClosingNotes(e.target.value)} rows={2}
                placeholder="Catatan penutupan shift..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <button
              onClick={handleCloseShift} disabled={closingLoading || !closingBalance}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {closingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Tutup Shift
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            <span className="font-semibold text-gray-700">Tidak Ada Shift Aktif</span>
          </div>
          <div className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-800">Buka Shift Baru</h3>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Modal Awal Kas (Rp)</label>
              <input
                type="number" value={openingBalance}
                onChange={e => setOpeningBalance(e.target.value)}
                placeholder="Contoh: 500000"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleOpenShift} disabled={openingLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {openingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Buka Shift
            </button>
          </div>
        </div>
      )}

      {/* Hasil tutup shift */}
      {closingResult && (
        <div className={`rounded-2xl p-5 border ${Math.abs(closingResult.diff) < 1000 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-3">
            {Math.abs(closingResult.diff) < 1000
              ? <CheckCircle className="w-5 h-5 text-green-600" />
              : <AlertTriangle className="w-5 h-5 text-orange-500" />}
            <span className="font-semibold text-gray-800">Shift Ditutup</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Total Penjualan</p>
              <p className="font-bold text-gray-800">{fmt(closingResult.salesTotal)}</p>
            </div>
            <div>
              <p className="text-gray-500">Selisih Kas</p>
              <p className={`font-bold ${Math.abs(closingResult.diff) < 1000 ? 'text-green-600' : 'text-orange-600'}`}>
                {closingResult.diff >= 0 ? '+' : ''}{fmt(closingResult.diff)}
              </p>
            </div>
          </div>
          <button onClick={() => setClosingResult(null)} className="mt-3 text-xs text-gray-400 hover:text-gray-600">
            Tutup notifikasi
          </button>
        </div>
      )}

      {/* Riwayat shift */}
      {showHistory && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Riwayat Shift (20 terakhir)</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {history.map(s => (
              <div key={s.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{s.kasirNama}</p>
                  <p className="text-xs text-gray-400">
                    {fmtTime(s.openedAt)} → {s.closedAt ? fmtTime(s.closedAt) : 'Masih berjalan'}
                  </p>
                  {s.notes && <p className="text-xs text-gray-500 mt-1 italic">"{s.notes}"</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  {s.status === 'OPEN'
                    ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Aktif</span>
                    : <div>
                        <p className="text-sm font-semibold text-gray-800">{fmt(s.systemBalance ?? 0)}</p>
                        <p className={`text-xs ${Math.abs(s.difference ?? 0) < 1000 ? 'text-green-600' : 'text-orange-500'}`}>
                          Selisih: {(s.difference ?? 0) >= 0 ? '+' : ''}{fmt(s.difference ?? 0)}
                        </p>
                      </div>
                  }
                </div>
              </div>
            ))}
            {history.length === 0 && (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">Belum ada riwayat shift</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}