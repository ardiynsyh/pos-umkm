'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { Card, Button, Input } from '@/components/ui';
import {
  saveWAConfig,
  loadWAConfig,
  sendWhatsAppNotification,
  WABusinessConfig,
} from '@/lib/utils/whatsapp';
import { QRCodeManager } from '@/components/settings/QRCodeManager';
import { QRCodeSVG } from 'qrcode.react';
import {
  Save, Settings as SettingsIcon, MessageCircle, Send,
  CheckCircle, XCircle, ExternalLink, Plus, Trash2, Download,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Table {
  id: string;
  number: number;
  label: string;
  isActive: boolean;
}

// ─── Komponen Manajemen Meja ──────────────────────────────────────────────────
function MejaManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<Table | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      const data = await res.json();
      setTables(data);
    } catch {
      console.error('Gagal memuat meja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newNumber) return;
    try {
      await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: parseInt(newNumber), label: newLabel.trim() }),
      });
      setNewLabel('');
      setNewNumber('');
      fetchTables();
    } catch {
      alert('Gagal menambah meja');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus meja ini?')) return;
    try {
      await fetch(`/api/tables/${id}`, { method: 'DELETE' });
      fetchTables();
    } catch {
      alert('Gagal menghapus meja');
    }
  };

  const handleDownloadQR = (table: Table) => {
    const svg = document.getElementById(`qr-dl-${table.id}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    canvas.width = 300;
    canvas.height = 300;
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 300);
      ctx.drawImage(img, 0, 0, 300, 300);
      const link = document.createElement('a');
      link.download = `QR-${table.label}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Tambah meja dan generate QR Code. Customer scan QR untuk memesan langsung dari HP.
      </p>

      <div className="flex gap-3">
        <input
          type="number"
          placeholder="No."
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <input
          type="text"
          placeholder="Label meja (cth: Meja VIP 1)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={handleAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Memuat meja...</p>
      ) : tables.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Belum ada meja. Tambah meja di atas.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {tables.map((table) => {
            const orderUrl = `${baseUrl}/order/${table.id}`;
            return (
              <div key={table.id} className="border border-gray-200 rounded-xl p-3 text-center bg-gray-50">
                <p className="font-bold text-gray-800 text-sm">{table.label}</p>
                <p className="text-xs text-gray-400 mb-2">No. {table.number}</p>
                <div className="hidden">
                  <QRCodeSVG id={`qr-dl-${table.id}`} value={orderUrl} size={256} />
                </div>
                <div className="flex justify-center mb-2">
                  <QRCodeSVG value={orderUrl} size={100} />
                </div>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => setSelectedQR(table)}
                    className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg py-1.5 text-xs font-medium hover:bg-blue-100"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => handleDownloadQR(table)}
                    className="flex-1 bg-green-50 text-green-600 border border-green-200 rounded-lg py-1.5 text-xs font-medium hover:bg-green-100 flex items-center justify-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Unduh
                  </button>
                  <button
                    onClick={() => handleDelete(table.id)}
                    className="bg-red-50 text-red-500 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full shadow-xl">
            <p className="font-bold text-xl mb-1">{selectedQR.label}</p>
            <p className="text-gray-400 text-sm mb-5">Scan untuk memesan</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={`${baseUrl}/order/${selectedQR.id}`} size={200} />
            </div>
            <p className="text-xs text-gray-400 break-all mb-5">
              {baseUrl}/order/{selectedQR.id}
            </p>
            <button
              onClick={() => setSelectedQR(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Halaman Utama ────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [copyright, setCopyright] = useState('');
  const [storeName, setStoreName] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [waConfig, setWaConfig] = useState<WABusinessConfig>({
    provider: 'fonnte',
    apiKey: '',
    ownerPhone: '',
    enabled: false,
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Load settings dari localStorage (tidak perlu database untuk config sederhana)
    setCopyright(localStorage.getItem('setting_copyright') ?? '');
    setStoreName(localStorage.getItem('setting_storeName') ?? 'Toko UMKM');
    setVoiceEnabled(localStorage.getItem('setting_voiceEnabled') !== 'false');
    setWaConfig(loadWAConfig());
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('setting_copyright', copyright);
      localStorage.setItem('setting_storeName', storeName);
      localStorage.setItem('setting_voiceEnabled', voiceEnabled.toString());
      localStorage.setItem('voiceEnabled', voiceEnabled.toString());
      saveWAConfig(waConfig);
      alert('Pengaturan berhasil disimpan!');
    } catch {
      alert('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWA = async () => {
    setIsTesting(true);
    setTestResult(null);
    const testConfig = { ...waConfig, enabled: true };
    saveWAConfig(testConfig);
    setWaConfig(testConfig);
    const dummy = {
      id: 0,
      transactionNumber: 'TEST-001',
      items: [{ productId: 1, productName: 'Produk Test', quantity: 1, price: 10000, subtotal: 10000 }],
      subtotal: 10000, tax: 0, discount: 0, total: 10000,
      paymentMethod: 'cash' as const,
      paymentAmount: 20000, change: 10000,
      cashierName: 'Test Kasir',
      createdAt: new Date(),
    };
    const result = await sendWhatsAppNotification(dummy, storeName || 'Toko UMKM');
    setTestResult(result);
    setIsTesting(false);
  };

  const providers = [
    {
      key: 'fonnte' as const,
      name: 'Fonnte',
      badge: 'WA Personal/Bisnis',
      badgeColor: 'bg-green-100 text-green-700',
      desc: 'Support WA Business. Free tier tersedia.',
      link: 'https://fonnte.com',
      steps: ['1. Daftar di fonnte.com', '2. Add Device → Scan QR dengan WA Business', '3. Dashboard → API Key → Copy'],
      fields: (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WA Business Owner</label>
            <Input value={waConfig.ownerPhone || ''} onChange={(e) => setWaConfig({ ...waConfig, ownerPhone: e.target.value })} placeholder="628123456789" />
            <p className="text-xs text-gray-500 mt-1">Format: 628xxxxxxxxx</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key Fonnte</label>
            <Input type="password" value={waConfig.apiKey || ''} onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })} placeholder="Paste API Key..." />
          </div>
        </>
      ),
    },
    {
      key: 'callmebot' as const,
      name: 'CallMeBot',
      badge: 'GRATIS',
      badgeColor: 'bg-blue-100 text-blue-700',
      desc: 'Gratis, hanya untuk nomor sendiri.',
      link: 'https://www.callmebot.com/blog/free-api-whatsapp-messages/',
      steps: ['1. Simpan +34 644 66 64 45 di kontak', '2. Kirim: "I allow callmebot to send me messages"', '3. Catat API Key dari balasan'],
      fields: (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WA Owner</label>
            <Input value={waConfig.ownerPhone || ''} onChange={(e) => setWaConfig({ ...waConfig, ownerPhone: e.target.value })} placeholder="08123456789" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Key CallMeBot</label>
            <Input type="password" value={waConfig.apiKey || ''} onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })} placeholder="Contoh: 1234567" />
          </div>
        </>
      ),
    },
    {
      key: 'wabusiness' as const,
      name: 'WA Business API',
      badge: 'RESMI META',
      badgeColor: 'bg-purple-100 text-purple-700',
      desc: 'Official Meta API. 1000 pesan/bln gratis.',
      link: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
      steps: ['1. Buka developers.facebook.com', '2. Buat App → WhatsApp → Cloud API', '3. Daftarkan nomor WA Business', '4. Copy Access Token & Phone Number ID'],
      fields: (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number ID</label>
            <Input value={waConfig.phoneNumberId || ''} onChange={(e) => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })} placeholder="Dari Meta Developer Console" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
            <Input type="password" value={waConfig.accessToken || ''} onChange={(e) => setWaConfig({ ...waConfig, accessToken: e.target.value })} placeholder="EAAxxxxxxxx..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Tujuan (Owner)</label>
            <Input value={waConfig.recipientPhone || ''} onChange={(e) => setWaConfig({ ...waConfig, recipientPhone: e.target.value })} placeholder="628123456789" />
          </div>
        </>
      ),
    },
  ];

  const activeProvider = providers.find((p) => p.key === waConfig.provider)!;

  return (
    <ProtectedRoute requireOwner>
      <Navbar />

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-100 p-3 rounded-lg">
              <SettingsIcon className="w-6 h-6 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Pengaturan Aplikasi</h1>
          </div>

          <div className="space-y-6">

            {/* ── Pengaturan Umum ── */}
            <Card title="Pengaturan Umum">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Toko</label>
                  <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Toko UMKM" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copyright / Created By</label>
                  <Input value={copyright} onChange={(e) => setCopyright(e.target.value)} placeholder="Created by Your Company" />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Voice Notification</p>
                    <p className="text-sm text-gray-500">Suara notifikasi setelah pembayaran</p>
                  </div>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${voiceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </Card>

            {/* ── Manajemen Meja ── */}
            <Card title="🪑 Manajemen Meja & QR Order Customer">
              <MejaManager />
            </Card>

            {/* ── QR Code Pembayaran ── */}
            <QRCodeManager />

            {/* ── WhatsApp Notifikasi ── */}
            <Card title="🟢 WhatsApp Notifikasi Owner">
              <div className="space-y-5">
                <div className={`flex items-center justify-between p-4 rounded-lg border ${waConfig.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div>
                    <p className="font-medium">Aktifkan Notifikasi WhatsApp</p>
                    <p className="text-sm text-gray-500">Kirim notifikasi ke owner setiap transaksi</p>
                  </div>
                  <button
                    onClick={() => setWaConfig({ ...waConfig, enabled: !waConfig.enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${waConfig.enabled ? 'bg-green-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${waConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Provider</label>
                  <div className="grid grid-cols-3 gap-2">
                    {providers.map((p) => (
                      <button
                        key={p.key}
                        onClick={() => setWaConfig({ ...waConfig, provider: p.key })}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${waConfig.provider === p.key ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <MessageCircle className={`w-3 h-3 ${waConfig.provider === p.key ? 'text-green-600' : 'text-gray-400'}`} />
                          <span className="text-xs font-bold">{p.name}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.badgeColor}`}>{p.badge}</span>
                        <p className="text-xs text-gray-500 mt-1 leading-tight">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-2">📋 Cara Setup {activeProvider.name}:</p>
                  <ul className="space-y-1 mb-3">
                    {activeProvider.steps.map((step, i) => (
                      <li key={i} className="text-sm text-blue-700">{step}</li>
                    ))}
                  </ul>
                  <a href={activeProvider.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                    Buka {activeProvider.name} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="space-y-4">{activeProvider.fields}</div>

                <Button
                  onClick={handleTestWA}
                  disabled={isTesting}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isTesting ? 'Mengirim...' : 'Test Kirim WA'}
                </Button>

                {testResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {testResult.success
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    <p className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.message}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* ── Simpan ── */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving} size="lg" className="flex items-center gap-2">
                <Save className="w-5 h-5" />
                {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
