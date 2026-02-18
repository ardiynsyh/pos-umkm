'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { db } from '@/lib/db/database';
import { Card, Button, Input } from '@/components/ui';
import {
  saveWAConfig,
  loadWAConfig,
  sendWhatsAppNotification,
  WABusinessConfig,
} from '@/lib/utils/whatsapp';
import { QRCodeManager } from '@/components/settings/QRCodeManager';
import {
  Save,
  Settings as SettingsIcon,
  MessageCircle,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';

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
    loadSettings();
    setWaConfig(loadWAConfig());
  }, []);

  const loadSettings = async () => {
    const settings = await db.settings.toArray();
    settings.forEach((s) => {
      if (s.key === 'copyright') setCopyright(s.value);
      else if (s.key === 'storeName') setStoreName(s.value);
      else if (s.key === 'voiceEnabled') setVoiceEnabled(s.value === 'true');
    });
  };

  const saveSetting = async (key: string, value: string) => {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id!, { value, updatedAt: new Date() });
    } else {
      await db.settings.add({ key, value, updatedAt: new Date() });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSetting('copyright', copyright);
      await saveSetting('storeName', storeName);
      await saveSetting('voiceEnabled', voiceEnabled.toString());
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
      steps: [
        '1. Daftar di fonnte.com',
        '2. Add Device → Scan QR dengan WA Business',
        '3. Dashboard → API Key → Copy',
      ],
      fields: (
        <>
          <div>
            <label htmlFor="fonnte-ownerPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor WA Business Owner
            </label>
            <Input
              id="fonnte-ownerPhone"
              value={waConfig.ownerPhone || ''}
              onChange={(e) => setWaConfig({ ...waConfig, ownerPhone: e.target.value })}
              placeholder="628123456789"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 628xxxxxxxxx (kode negara 62, tanpa +)</p>
          </div>
          <div>
            <label htmlFor="fonnte-apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key Fonnte
            </label>
            <Input
              id="fonnte-apiKey"
              type="password"
              value={waConfig.apiKey || ''}
              onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })}
              placeholder="Paste API Key..."
            />
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
      steps: [
        '1. Simpan +34 644 66 64 45 di kontak',
        '2. Kirim: "I allow callmebot to send me messages"',
        '3. Catat API Key dari balasan',
      ],
      fields: (
        <>
          <div>
            <label htmlFor="callmebot-ownerPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor WA Owner
            </label>
            <Input
              id="callmebot-ownerPhone"
              value={waConfig.ownerPhone || ''}
              onChange={(e) => setWaConfig({ ...waConfig, ownerPhone: e.target.value })}
              placeholder="08123456789"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 08xxxxxxxxx</p>
          </div>
          <div>
            <label htmlFor="callmebot-apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key CallMeBot
            </label>
            <Input
              id="callmebot-apiKey"
              type="password"
              value={waConfig.apiKey || ''}
              onChange={(e) => setWaConfig({ ...waConfig, apiKey: e.target.value })}
              placeholder="Contoh: 1234567"
            />
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
      steps: [
        '1. Buka developers.facebook.com',
        '2. Buat App → WhatsApp → Cloud API',
        '3. Daftarkan nomor WA Business',
        '4. Copy Access Token & Phone Number ID',
      ],
      fields: (
        <>
          <div>
            <label htmlFor="wabusiness-phoneNumberId" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number ID
            </label>
            <Input
              id="wabusiness-phoneNumberId"
              value={waConfig.phoneNumberId || ''}
              onChange={(e) => setWaConfig({ ...waConfig, phoneNumberId: e.target.value })}
              placeholder="Dari Meta Developer Console"
            />
          </div>
          <div>
            <label htmlFor="wabusiness-accessToken" className="block text-sm font-medium text-gray-700 mb-1">
              Access Token
            </label>
            <Input
              id="wabusiness-accessToken"
              type="password"
              value={waConfig.accessToken || ''}
              onChange={(e) => setWaConfig({ ...waConfig, accessToken: e.target.value })}
              placeholder="EAAxxxxxxxx..."
            />
          </div>
          <div>
            <label htmlFor="wabusiness-recipientPhone" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Tujuan (Owner)
            </label>
            <Input
              id="wabusiness-recipientPhone"
              value={waConfig.recipientPhone || ''}
              onChange={(e) => setWaConfig({ ...waConfig, recipientPhone: e.target.value })}
              placeholder="628123456789"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 628xxxxxxxxx (tanpa + atau spasi)</p>
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

            {/* ── General ── */}
            <Card title="Pengaturan Umum">
              <div className="space-y-4">
                <div>
                  <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Toko
                  </label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="Toko UMKM"
                  />
                </div>
                <div>
                  <label htmlFor="copyright" className="block text-sm font-medium text-gray-700 mb-1">
                    Copyright / Created By
                  </label>
                  <Input
                    id="copyright"
                    value={copyright}
                    onChange={(e) => setCopyright(e.target.value)}
                    placeholder="Created by Your Company"
                  />
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

            {/* ── QR Code Pembayaran ── */}
            <QRCodeManager />

            {/* ── WhatsApp ── */}
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
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          waConfig.provider === p.key ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
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

                {testResult && (
                  <div className={`flex items-start gap-2 p-3 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    {testResult.success
                      ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                    <div>
                      <p className={`text-sm font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {testResult.success ? '✅ Berhasil!' : '❌ Gagal!'}
                      </p>
                      <p className={`text-xs mt-0.5 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>{testResult.message}</p>
                    </div>
                  </div>
                )}

                <Button variant="outline" onClick={handleTestWA} disabled={isTesting} className="w-full flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  {isTesting ? 'Mengirim...' : 'Kirim Pesan Test ke WhatsApp'}
                </Button>

                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Preview pesan:</p>
                  <div className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg font-mono overflow-auto">
                    <pre className="whitespace-pre-wrap">{`🛒 *NOTIFIKASI PENJUALAN*
🏪 ${storeName || 'Toko UMKM'}
━━━━━━━━━━━━━━━━━━
📋 No: TRX20260217001
📅 17/02/2026 14:30
👤 Kasir: Kasir Demo
━━━━━━━━━━━━━━━━━━
*Item Pembelian:*
  • Indomie Goreng x2 = Rp 6.000
━━━━━━━━━━━━━━━━━━
💰 Total: *Rp 6.000*
💳 Metode: Tunai
💵 Bayar: Rp 10.000
💱 Kembalian: Rp 4.000
━━━━━━━━━━━━━━━━━━
✅ Transaksi berhasil!`}</pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* ── Database ── */}
            <Card title="Informasi Database">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-600">Database Type</span>
                  <span className="font-medium">IndexedDB (Dexie.js)</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Cara Lihat</span>
                  <span className="font-medium text-blue-600">F12 → Application → IndexedDB</span>
                </div>
              </div>
            </Card>

            {/* ── Save ── */}
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