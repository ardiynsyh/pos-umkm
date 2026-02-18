'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db/database';
import { Card, Button } from '@/components/ui';
import {
  Database,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  Shield,
} from 'lucide-react';

// ⚠️ PASSWORD MASTER - HANYA PEMILIK APLIKASI YANG TAHU
// GANTI PASSWORD INI DENGAN PASSWORD ANDA SENDIRI!
const MASTER_PASSWORD = '@Login123';

export default function DatabasePage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [stats, setStats] = useState({ products: 0, transactions: 0, categories: 0, users: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastAction, setLastAction] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Block DevTools untuk Owner/Kasir
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert('⚠️ Fitur ini dinonaktifkan untuk keamanan!');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault();
        alert('⚠️ Akses ditolak! Hanya pemilik aplikasi yang dapat mengakses.');
      }
    };

    const detectDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#1e1e1e;color:#fff;font-family:monospace;">
            <div style="text-align:center;">
              <h1 style="color:#ef4444;font-size:3rem;">🚫 ACCESS DENIED</h1>
              <p style="font-size:1.2rem;margin-top:1rem;">DevTools terdeteksi!</p>
              <p>Tutup DevTools dan refresh halaman.</p>
            </div>
          </div>
        `;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    const interval = setInterval(detectDevTools, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(interval);
    };
  }, []);

  const loadStats = async () => {
    const products = await db.products.count();
    const transactions = await db.transactions.count();
    const categories = await db.categories.count();
    const users = await db.users.count();
    setStats({ products, transactions, categories, users });
  };

  useEffect(() => {
    if (isUnlocked) loadStats();
  }, [isUnlocked]);

  const handleUnlock = () => {
    if (passwordInput === MASTER_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError('');
      const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
      sessionStorage.setItem('dbUnlocked', expiry.toString());
    } else {
      setPasswordError('⚠️ Password salah! Akses ditolak.');
      setPasswordInput('');
    }
  };

  useEffect(() => {
    const unlocked = sessionStorage.getItem('dbUnlocked');
    if (unlocked && Date.now() < parseInt(unlocked)) {
      setIsUnlocked(true);
    }
  }, []);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        data: {
          products: await db.products.toArray(),
          transactions: await db.transactions.toArray(),
          categories: await db.categories.toArray(),
          users: await db.users.toArray(),
          settings: await db.settings.toArray(),
          paymentQRs: await db.paymentQRs.toArray(),
        },
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
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

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const backup = JSON.parse(text);
        if (!backup.data) throw new Error('Format backup tidak valid');
        if (!confirm(`Import ${backup.data.products?.length || 0} produk, ${backup.data.transactions?.length || 0} transaksi?`)) return;
        await db.products.clear();
        await db.transactions.clear();
        await db.categories.clear();
        await db.users.clear();
        await db.settings.clear();
        await db.paymentQRs.clear();
        if (backup.data.products?.length) await db.products.bulkAdd(backup.data.products);
        if (backup.data.transactions?.length) await db.transactions.bulkAdd(backup.data.transactions);
        if (backup.data.categories?.length) await db.categories.bulkAdd(backup.data.categories);
        if (backup.data.users?.length) await db.users.bulkAdd(backup.data.users);
        if (backup.data.settings?.length) await db.settings.bulkAdd(backup.data.settings);
        if (backup.data.paymentQRs?.length) await db.paymentQRs.bulkAdd(backup.data.paymentQRs);
        setLastAction({ type: 'success', message: 'Import berhasil!' });
        setTimeout(() => window.location.reload(), 1500);
      } catch (error: any) {
        setLastAction({ type: 'error', message: `Import gagal: ${error.message}` });
      }
    };
    input.click();
  };

  const handleReset = async () => {
    if (prompt('⚠️ Ketik "RESET" untuk menghapus semua data:') !== 'RESET') {
      alert('Reset dibatalkan');
      return;
    }
    setIsResetting(true);
    try {
      await db.delete();
      setLastAction({ type: 'success', message: 'Database berhasil direset!' });
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      setLastAction({ type: 'error', message: 'Reset gagal' });
      setIsResetting(false);
    }
  };

  const handleViewData = async (table: string) => {
    let data: any[] = [];
    switch (table) {
      case 'products': data = await db.products.toArray(); break;
      case 'transactions': data = await db.transactions.toArray(); break;
      case 'categories': data = await db.categories.toArray(); break;
      case 'users': data = await db.users.toArray(); break;
    }
    const json = JSON.stringify(data, null, 2);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>${table.toUpperCase()}</title><style>body{font-family:monospace;padding:20px;background:#1e1e1e;color:#d4d4d4;}pre{white-space:pre-wrap;}</style></head><body><h1>${table.toUpperCase()} (${data.length} records)</h1><pre>${json}</pre></body></html>`);
    }
  };

  const handleClearTable = async (table: string, label: string) => {
    if (!confirm(`Hapus semua data di tabel "${label}"?`)) return;
    try {
      switch (table) {
        case 'products': await db.products.clear(); break;
        case 'transactions': await db.transactions.clear(); break;
        case 'categories': await db.categories.clear(); break;
        case 'users': await db.users.clear(); break;
      }
      setLastAction({ type: 'success', message: `Tabel ${label} berhasil dikosongkan` });
      loadStats();
    } catch {
      setLastAction({ type: 'error', message: `Gagal menghapus tabel ${label}` });
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
                    onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
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
                      <li>• DevTools dinonaktifkan</li>
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
            <button
              onClick={() => {
                sessionStorage.removeItem('dbUnlocked');
                setIsUnlocked(false);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
          </div>
          {lastAction && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${lastAction.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {lastAction.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              <p className="text-sm font-medium">{lastAction.message}</p>
            </div>
          )}
          <Card title="🚀 Aksi Cepat">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button onClick={handleExport} disabled={isExporting} className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export Backup'}
              </button>
              <button onClick={handleImport} className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors">
                <Upload className="w-4 h-4" />
                Import Backup
              </button>
              <button onClick={handleReset} disabled={isResetting} className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                <RefreshCw className="w-4 h-4" />
                {isResetting ? 'Resetting...' : 'Reset Database'}
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
                  <div className="flex gap-2">
                    <button onClick={() => handleViewData(t.key)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700">
                      <Eye className="w-4 h-4" />
                      Lihat
                    </button>
                    <button onClick={() => handleClearTable(t.key, t.label)} className="flex items-center justify-center gap-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm">
                      <Trash2 className="w-4 h-4" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="🔒 Security Status" className="mt-6">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /><span>DevTools Protection: <strong>Active</strong></span></div>
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /><span>Right-Click: <strong>Disabled</strong></span></div>
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /><span>Keyboard Shortcuts: <strong>Blocked</strong></span></div>
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-4 h-4" /><span>Session Timeout: <strong>1 Hour</strong></span></div>
            </div>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
