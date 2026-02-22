'use client';
// app/(dashboard)/target-penjualan/page.tsx

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { Target, TrendingUp, Calendar, Loader2, CheckCircle2 } from 'lucide-react';

type TargetData = {
  monthly: { target: number; actual: number };
  daily:   { target: number; actual: number };
};

const fmt    = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const pct    = (actual: number, target: number) => target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;
const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
      <div className={`h-3 rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

export default function TargetPenjualanPage() {
  const { user }   = useAuthStore();
  const outletId   = user?.outletId ?? '';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const isAdmin      = user?.role === 'ADMIN';
  const canEdit      = isSuperAdmin || isAdmin;

  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [data,    setData]    = useState<TargetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved,   setSaved]   = useState(false);

  const [monthlyInput, setMonthlyInput] = useState('');
  const [dailyInput,   setDailyInput]   = useState('');
  const [saving,       setSaving]       = useState(false);

  const fetchData = async () => {
    if (!outletId) return;
    setLoading(true);
    const r = await fetch(`/api/sales-target?outletId=${outletId}&year=${year}&month=${month}`);
    const d = await r.json();
    setData(d);
    setMonthlyInput(d.monthly?.target > 0 ? String(d.monthly.target) : '');
    setDailyInput(d.daily?.target > 0 ? String(d.daily.target) : '');
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [outletId, year, month]);

  const handleSave = async () => {
    setSaving(true);
    const promises = [];
    if (monthlyInput) {
      promises.push(fetch('/api/sales-target', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outletId, type: 'MONTHLY', amount: parseFloat(monthlyInput), year, month, day: null }),
      }));
    }
    if (dailyInput) {
      promises.push(fetch('/api/sales-target', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outletId, type: 'DAILY', amount: parseFloat(dailyInput), year, month, day: now.getDate() }),
      }));
    }
    await Promise.all(promises);
    await fetchData();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const monthlyPct = pct(data?.monthly.actual ?? 0, data?.monthly.target ?? 0);
  const dailyPct   = pct(data?.daily.actual ?? 0, data?.daily.target ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-violet-100 p-3 rounded-xl">
          <Target className="w-6 h-6 text-violet-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Target Penjualan</h1>
          <p className="text-sm text-gray-500">Pantau pencapaian target penjualan outlet</p>
        </div>
      </div>

      {/* Filter bulan */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <Calendar className="w-4 h-4 text-gray-400" />
        <select value={month} onChange={e => setMonth(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* Progress cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Monthly */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-violet-500" />
                  <span className="font-semibold text-gray-800">Target Bulanan</span>
                </div>
                <span className={`text-lg font-bold ${monthlyPct >= 100 ? 'text-green-600' : monthlyPct >= 70 ? 'text-blue-600' : 'text-gray-700'}`}>
                  {monthlyPct}%
                </span>
              </div>
              <ProgressBar value={monthlyPct} color={monthlyPct >= 100 ? 'bg-green-500' : monthlyPct >= 70 ? 'bg-blue-500' : 'bg-violet-400'} />
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Tercapai</p>
                  <p className="font-semibold text-gray-800">{fmt(data?.monthly.actual ?? 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Target</p>
                  <p className="font-semibold text-gray-800">{data?.monthly.target ? fmt(data.monthly.target) : '—'}</p>
                </div>
              </div>
              {monthlyPct >= 100 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Target tercapai! 🎉
                </div>
              )}
            </div>

            {/* Daily */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className="font-semibold text-gray-800">Target Hari Ini</span>
                </div>
                <span className={`text-lg font-bold ${dailyPct >= 100 ? 'text-green-600' : dailyPct >= 70 ? 'text-orange-600' : 'text-gray-700'}`}>
                  {dailyPct}%
                </span>
              </div>
              <ProgressBar value={dailyPct} color={dailyPct >= 100 ? 'bg-green-500' : dailyPct >= 70 ? 'bg-orange-400' : 'bg-orange-300'} />
              <div className="flex justify-between text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Tercapai</p>
                  <p className="font-semibold text-gray-800">{fmt(data?.daily.actual ?? 0)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs">Target</p>
                  <p className="font-semibold text-gray-800">{data?.daily.target ? fmt(data.daily.target) : '—'}</p>
                </div>
              </div>
              {dailyPct >= 100 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Target hari ini tercapai! 🎉
                </div>
              )}
            </div>
          </div>

          {/* Set target form (hanya SUPERADMIN & ADMIN) */}
          {canEdit && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
              <h3 className="font-semibold text-gray-800">Atur Target</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Target Bulanan (Rp)</label>
                  <input type="number" value={monthlyInput} onChange={e => setMonthlyInput(e.target.value)}
                    placeholder="Contoh: 10000000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Target Hari Ini (Rp)</label>
                  <input type="number" value={dailyInput} onChange={e => setDailyInput(e.target.value)}
                    placeholder="Contoh: 500000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                {saved ? 'Tersimpan!' : 'Simpan Target'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}