'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui';
import {
  Database, Download, RefreshCw, Eye, Lock, Unlock,
  AlertTriangle, CheckCircle, Shield,
} from 'lucide-react';

const MASTER_PASSWORD = '@Login123';

export default function DatabasePage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [stats, setStats] = useState({ products: 0, transactions: 0, categories: 0, users: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const unlocked = sessionStorage.getItem('dbUnlocked');
    if (unlocked && Date.now() < parseInt(unlocked)) {
      setIsUnlocked(true);
    }
  }, []);

  const loadStats = async () => {
    try {
      const [products, transactions, categories, users] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
      ]);
      setStats({
        products: Array.isArray(products) ? products.length : (products?.data?.length ?? 0),
        transactions: Array.isArray(transactions) ? transactions.length : (transactions?.data?.length ?? 0),
        categories: Array.isArray(categories) ? categories.length : (categories?.data?.length ?? 0),
        users: Array.isArray(users) ? users.length : (users?.data?.length ?? 0),
      });
    } catch {
      setLastAction({ type: 'error', message: 'Gagal memuat statistik database' });
    }
  };

  useEffect(() => {
    if (isUnlocked) loadStats();
  }, [isUnlocked]);

  const handleUnlock = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError('');
      const expiry = Date.now() + 60 * 60 * 1000;
      sessionStorage.setItem('dbUnlocked', expiry.toString());
    } else {
      setPasswordError('⚠️ Password salah! Akses ditolak.');
      setPasswordInput('');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [products, transactions, categories, users] = await Promise.all([
        fetch('/api/products').then(r => r.json()),
        fetch('/api/transactions').then(r => r.json()),
        fetch('/api/categories').then(r => r.json()),
        fetch('/api/users').then(r => r.json()),
      ]);
      const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        data: { products, transactions, categories, users },
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pos-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setLastAction({ type: 'success', message: 'Backup berhasil didownload!' });
    } catch {
      setLastAction({ type: 'error', message: 'Gagal export database' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleViewData = async (endpoint: string, label: string) => {
    try {
      const res = await fetch(`/api/${endpoint}`);
      const data = await res.json();
      const records = Array.isArray(data) ? data : (data?.data ?? data);
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(`
          <html>
            <head>
              <title>${label.toUpperCase()}</title>
              <style>body{font-family:monospace;padding:20px;background:#1e1e1e;color:#d4d4d4;}pre{white-space:pre-wrap;}</style>
            </head>
            <body>
              <h1>${label.toUpperCase()} (${records.length} records)</h1>
              <pre>${JSON.stringify(records, null, 2)}</pre>
            </body>
          </html>
        `);
      }
    } catch {
      setLastAction({ type: 'error', message: `Gagal memuat data ${label}` });
    }
  };

  // ─── LOCK SCREEN ─────────────────────────────────────────────────────────
  if (!isUnlocked) {
    return (
      <ProtectedRoute requireOwner>
        <Navbar />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 border border-gray-700 rounded-lg p-8">
            <div className="text-center mb-6">
              <div className="bg-red-900/20 p-4 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Shield className="w-10 h-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">🔒 Database Manager</h1>
              <p className="text-gray-400 text-sm">Akses terbatas untuk pemilik aplikasi</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password Master</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    placeholder="Masukkan password master"
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
              </div>
              <button
                onClick={handleUnlock}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Unlock className="w-4 h-4" />
                Unlock Database Manager
              </button>
              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-300">
                    <p className="font-semibold mb-1">⚠️ Peringatan Keamanan</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Password hanya untuk pemilik aplikasi</li>
                      <li>• Jangan bagikan ke owner/kasir</li>
                      <li>• Session expired dalam 1 jam</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // ─── UNLOCKED VIEW ───────────────────────────────────────────────────────
  const tables = [
    { key: 'products', label: 'Produk', count: stats.products, icon: '📦' },
    { key: 'transactions', label: 'Transaksi', count: stats.transactions, icon: '🧾' },
    { key: 'categories', label: 'Kategori', count: stats.categories, icon: '📂' },
    { key: 'users', label: 'Users', count: stats.users, icon: '👤' },
  ];

  return (
    <ProtectedRoute requireOwner>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Database Manager</h1>
                <p className="text-sm text-green-600">✓ Unlocked (Admin Mode)</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadStats}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={() => { sessionStorage.removeItem('dbUnlocked'); setIsUnlocked(false); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Lock
              </button>
            </div>
          </div>

          {lastAction && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${lastAction.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {lastAction.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="text-sm font-medium">{lastAction.message}</p>
            </div>
          )}

          <Card title="🚀 Aksi Cepat">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Backup (JSON)'}
              </button>
              <button
                onClick={loadStats}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Stats
              </button>
            </div>
          </Card>

          <Card title="📊 Data Overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tables.map((t) => (
                <div key={t.key} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{t.icon}</span>
                      <div>
                        <h3 className="font-semibold text-gray-800">{t.label}</h3>
                        <p className="text-sm text-gray-500">{t.count} records</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleViewData(t.key, t.label)}
                    className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700"
                  >
                    <Eye className="w-4 h-4" />
                    Lihat Data
                  </button>
                </div>
              ))}
            </div>
          </Card>

          <Card title="ℹ️ Info Database" className="mt-6">
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Database menggunakan <strong>PostgreSQL via Prisma</strong></p>
              <p>✅ Data tersimpan di server, bukan di browser</p>
              <p>✅ Backup otomatis tersedia di platform hosting</p>
              <p className="text-yellow-600">⚠️ Reset database hanya bisa dilakukan melalui Prisma Studio atau dashboard database</p>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}