'use client';

import { useState } from 'react';
import { ICartItem } from '@/lib/db/dexie';
import { dbHelpers } from '@/lib/db/dexie';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckoutModalProps {
  items: ICartItem[];
  subtotal: number;
  onClose: () => void;
  onComplete: () => void;
}

export function CheckoutModal({ items, subtotal, onClose, onComplete }: CheckoutModalProps) {
  const [diskon, setDiskon] = useState(0);
  const [pajak, setPajak] = useState(0);
  const [metodePembayaran, setMetodePembayaran] = useState<'TUNAI' | 'DEBIT' | 'KREDIT' | 'QRIS'>('TUNAI');
  const [uangDibayar, setUangDibayar] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const isOnline = useOnlineStatus();

  const totalPajak = (subtotal * pajak) / 100;
  const totalBayar = subtotal + totalPajak - diskon;
  const kembalian = uangDibayar - totalBayar;

  const handleCheckout = async () => {
    if (metodePembayaran === 'TUNAI' && uangDibayar < totalBayar) {
      alert('Uang yang dibayar kurang!');
      return;
    }

    setIsProcessing(true);

    try {
      const nomorTransaksi = `TRX-${Date.now()}`;
      
      const transactionData = {
        nomorTransaksi,
        total: subtotal,
        diskon,
        pajak: totalPajak,
        totalBayar,
        uangDibayar: metodePembayaran === 'TUNAI' ? uangDibayar : totalBayar,
        kembalian: metodePembayaran === 'TUNAI' ? kembalian : 0,
        metodePembayaran,
        items,
      };

      if (isOnline) {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionData),
        });

        if (!response.ok) throw new Error('Failed to save transaction');
        
        alert('Transaksi berhasil!');
      } else {
        await dbHelpers.saveOfflineTransaction(transactionData);
        alert('Transaksi disimpan offline. Akan disinkronkan saat online.');
      }

      printReceipt(transactionData);
      onComplete();
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Terjadi kesalahan saat checkout!');
    } finally {
      setIsProcessing(false);
    }
  };

  const printReceipt = (data: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk - ${data.nomorTransaksi}</title>
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 10mm; }
          }
          body { font-family: monospace; font-size: 12px; width: 80mm; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { padding: 2px 0; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <div class="center bold">TOKO UMKM</div>
        <div class="center">Jl. Contoh No. 123</div>
        <div class="center">Telp: 0812-3456-7890</div>
        <div class="divider"></div>
        <div>${new Date().toLocaleString('id-ID')}</div>
        <div>No: ${data.nomorTransaksi}</div>
        <div class="divider"></div>
        
        <table>
          ${data.items.map((item: ICartItem) => `
            <tr>
              <td colspan="3">${item.nama}</td>
            </tr>
            <tr>
              <td>${item.quantity} x ${item.hargaSatuan.toLocaleString('id-ID')}</td>
              <td class="right">${item.subtotal.toLocaleString('id-ID')}</td>
            </tr>
          `).join('')}
        </table>
        
        <div class="divider"></div>
        <table>
          <tr>
            <td>Subtotal:</td>
            <td class="right">Rp ${data.total.toLocaleString('id-ID')}</td>
          </tr>
          ${data.diskon > 0 ? `
          <tr>
            <td>Diskon:</td>
            <td class="right">Rp ${data.diskon.toLocaleString('id-ID')}</td>
          </tr>
          ` : ''}
          ${data.pajak > 0 ? `
          <tr>
            <td>Pajak:</td>
            <td class="right">Rp ${data.pajak.toLocaleString('id-ID')}</td>
          </tr>
          ` : ''}
          <tr class="bold">
            <td>TOTAL:</td>
            <td class="right">Rp ${data.totalBayar.toLocaleString('id-ID')}</td>
          </tr>
          ${data.metodePembayaran === 'TUNAI' ? `
          <tr>
            <td>Dibayar:</td>
            <td class="right">Rp ${data.uangDibayar.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td>Kembalian:</td>
            <td class="right">Rp ${data.kembalian.toLocaleString('id-ID')}</td>
          </tr>
          ` : ''}
        </table>
        
        <div class="divider"></div>
        <div class="center">Terima Kasih</div>
        <div class="center">Selamat Berbelanja Kembali</div>
        
        <script>
          window.print();
          window.onafterprint = () => window.close();
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex justify-between text-lg">
            <span>Subtotal:</span>
            <span className="font-semibold">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Diskon (Rp)</label>
            <input
              type="number"
              value={diskon}
              onChange={(e) => setDiskon(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Pajak (%)</label>
            <input
              type="number"
              value={pajak}
              onChange={(e) => setPajak(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-2 gap-2">
              {(['TUNAI', 'DEBIT', 'KREDIT', 'QRIS'] as const).map((metode) => (
                <button
                  key={metode}
                  onClick={() => setMetodePembayaran(metode)}
                  className={`p-3 border rounded-md text-sm font-medium transition-colors ${
                    metodePembayaran === metode
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }`}
                >
                  {metode}
                </button>
              ))}
            </div>
          </div>

          {metodePembayaran === 'TUNAI' && (
            <div>
              <label className="block text-sm font-medium mb-1">Uang Dibayar</label>
              <input
                type="number"
                value={uangDibayar}
                onChange={(e) => setUangDibayar(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex justify-between text-2xl font-bold mb-2">
              <span>Total Bayar:</span>
              <span>Rp {totalBayar.toLocaleString('id-ID')}</span>
            </div>

            {metodePembayaran === 'TUNAI' && uangDibayar > 0 && (
              <div className="flex justify-between text-lg text-green-600">
                <span>Kembalian:</span>
                <span className="font-semibold">Rp {Math.max(0, kembalian).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full h-12 text-lg font-semibold"
          >
            {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
          </Button>
        </div>
      </div>
    </div>
  );
}