'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Tambahkan komponen ini ke halaman Settings (app/settings/page.tsx)
// atau buat halaman baru app/settings/meja/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, Download, QrCode } from 'lucide-react';

interface Table {
  id: string;
  number: number;
  label: string;
  isActive: boolean;
}

export default function MejaSettingsPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQR, setSelectedQR] = useState<Table | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const fetchTables = async () => {
    try {
      const res = await fetch('/api/tables');
      const data = await res.json().catch(() => null);
      // eslint-disable-next-line no-console
      console.log('GET /api/tables response', res.status, data);
      if (!res.ok) {
        alert('Gagal memuat meja');
        setTables([]);
      } else {
        setTables(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('fetchTables error', err);
      alert('Gagal koneksi ke server saat memuat meja');
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTables(); }, []);

  const handleAdd = async () => {
    if (!newLabel.trim() || !newNumber) {
      alert('Isi nomor dan label meja terlebih dahulu');
      return;
    }

    const number = parseInt(newNumber, 10);
    if (!Number.isFinite(number)) {
      alert('Nomor meja tidak valid');
      return;
    }

    if (tables.some((t) => t.number === number)) {
      alert('Nomor meja sudah terdaftar');
      return;
    }

    try {
      const res = await fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, label: newLabel.trim() }),
      });

      if (res.status === 409) {
        alert('Nomor meja sudah terdaftar');
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Gagal menambah meja');
        return;
      }

      const created = await res.json().catch(() => null);
      // log and alert response for debugging
      // eslint-disable-next-line no-console
      console.log('POST /api/tables response', res.status, created);
      alert('Server response: ' + (created ? JSON.stringify(created) : 'null'));

      setNewLabel('');
      setNewNumber('');

      // optimistic UI update: add created table to list if available
      if (created && created.id) {
        setTables((prev) => [created, ...prev]);
      } else {
        fetchTables();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Tambah meja error', err);
      alert('Gagal menambah meja');
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tables/${id}`, { method: 'DELETE' });
    fetchTables();
  };

  const handleDownloadQR = (table: Table) => {
    const svg = document.getElementById(`qr-${table.id}`);
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
    <ProtectedRoute>
      <Navbar />
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-8">

          <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <QrCode className="w-6 h-6 text-orange-500" />
            Manajemen Meja & QR Code
          </h1>

          {/* Tambah Meja */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
            <h2 className="font-semibold text-gray-700 mb-4">Tambah Meja Baru</h2>
            <div className="flex gap-3">
              <input
                type="number"
                placeholder="No. Meja"
                value={newNumber}
                onChange={(e) => setNewNumber(e.target.value)}
                className="w-28 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <input
                type="text"
                placeholder="Label (cth: Meja VIP 1)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <button
                onClick={handleAdd}
                className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah
              </button>
            </div>
          </div>

          {/* Daftar Meja */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {tables.map((table) => {
              const orderUrl = `${baseUrl}/order/${table.id}`;
              return (
                <div key={table.id} className="bg-white rounded-2xl shadow-sm p-4 text-center">
                  <p className="font-bold text-gray-800 mb-1">{table.label}</p>
                  <p className="text-xs text-gray-400 mb-3">Nomor {table.number}</p>

                  {/* QR Code tersembunyi untuk download */}
                  <div className="hidden">
                    <QRCodeSVG id={`qr-${table.id}`} value={orderUrl} size={256} />
                  </div>

                  {/* QR Code tampil */}
                  <div className="flex justify-center mb-3">
                    <QRCodeSVG key={table.id} id={`qr-visible-${table.id}`} value={orderUrl} size={140} />
                  </div>

                  <p className="text-xs text-gray-400 break-all mb-4">{orderUrl}</p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedQR(table)}
                      className="flex-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl py-2 text-xs font-medium hover:bg-orange-100"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleDownloadQR(table)}
                      className="flex-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-xl py-2 text-xs font-medium hover:bg-blue-100 flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Unduh
                    </button>
                    <button
                      onClick={() => handleDelete(table.id)}
                      className="bg-red-50 text-red-500 border border-red-200 rounded-xl px-3 py-2 hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Preview QR */}
          {selectedQR && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
              <div className="bg-white rounded-2xl p-8 text-center max-w-xs w-full">
                <p className="font-bold text-xl mb-1">{selectedQR.label}</p>
                <p className="text-gray-400 text-sm mb-5">Scan untuk memesan</p>
                <div className="flex justify-center mb-5">
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
      </div>
    </ProtectedRoute>
  );
}
