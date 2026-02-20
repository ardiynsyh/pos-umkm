'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { CartItem } from '@/hooks/useCart';
import { Banknote, CreditCard, Smartphone, Printer, MessageCircle } from 'lucide-react';

// Interface untuk response dari API
interface TransactionResponse {
  id: string;
  nomorTransaksi: string;
  items: Array<{
    productId: string;
    namaProduk: string;
    quantity: number;
    hargaSatuan: number;
    subtotal: number;
  }>;
  total: number;
  diskon: number;
  pajak: number;
  totalBayar: number;
  uangDibayar: number;
  kembalian: number;
  metodePembayaran: string;
  status: string;
  createdAt: string;
}

// Interface untuk receipt (format yang ditampilkan)
interface ReceiptData {
  id: string;
  transactionNumber: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentAmount: number;
  change: number;
  cashierName: string;
  createdAt: Date;
}

// Interface untuk WhatsApp notification
interface WhatsAppData {
  id: string;
  transactionNumber: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'ewallet';
  paymentAmount: number;
  change: number;
  cashierName: string;
  createdAt: Date;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  total: number;
  cashierName?: string;
  onPaymentComplete: () => void;
}

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount).replace('IDR', 'Rp').trim();
};

const formatDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const generateTransactionNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TRX-${year}${month}${day}-${random}`;
};

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  total,
  cashierName,
  onPaymentComplete,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'ewallet'>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<ReceiptData | null>(null);
  const [waSent, setWaSent] = useState<boolean | null>(null);

  const paidAmount = parseFloat(paymentAmount) || 0;
  const change = paidAmount - total;

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && paidAmount < total) {
      alert('Jumlah pembayaran kurang!');
      return;
    }

    setIsProcessing(true);

    try {
      const nomorTransaksi = generateTransactionNumber();
      const uangDibayar = paidAmount || total;
      const kembalian = paymentMethod === 'cash' ? Math.max(0, change) : 0;

      // Format items sesuai yang diharapkan API
      const items = cartItems.map((item) => ({
        productId: item.id,
        nama: item.name,
        quantity: item.quantity,
        hargaSatuan: item.price,
        subtotal: item.subtotal,
      }));

      // Ambil outletId dari API dengan better error handling
      let outletId = null;
      try {
        console.log('Fetching outlets...');
        const outletRes = await fetch('/api/outlets');
        
        if (outletRes.ok) {
          const outlets = await outletRes.json();
          console.log('Outlets response:', outlets);
          
          if (Array.isArray(outlets) && outlets.length > 0) {
            outletId = outlets[0]?.id;
          } else if (outlets?.data && Array.isArray(outlets.data) && outlets.data.length > 0) {
            outletId = outlets.data[0]?.id;
          } else if (outlets?.id) {
            outletId = outlets.id;
          }
        } else {
          console.warn('Failed to fetch outlets, status:', outletRes.status);
        }
      } catch (error) {
        console.warn('Error fetching outlets:', error);
      }

      // Buat payload tanpa outletId jika tidak ditemukan
      const payload: any = {
        nomorTransaksi,
        total,
        diskon: 0,
        pajak: 0,
        totalBayar: total,
        uangDibayar,
        kembalian,
        metodePembayaran: paymentMethod,
        items,
        kasir: cashierName || 'Kasir',
      };

      // Hanya tambahkan outletId jika ada
      if (outletId) {
        payload.outletId = outletId;
      }

      console.log('Sending payload:', payload);

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      console.log('Response:', responseData);

      if (!res.ok) {
        throw new Error(responseData.error || responseData.details || 'Gagal memproses pembayaran');
      }

      const { transaction } = responseData;

      // Buat objek untuk Receipt
      const receiptData: ReceiptData = {
        id: transaction.id,
        transactionNumber: transaction.nomorTransaksi || nomorTransaksi,
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.nama,
          quantity: item.quantity,
          price: item.hargaSatuan,
          subtotal: item.subtotal,
        })),
        subtotal: total,
        tax: 0,
        discount: 0,
        total: total,
        paymentMethod: paymentMethod,
        paymentAmount: uangDibayar,
        change: kembalian,
        cashierName: cashierName || 'Kasir',
        createdAt: new Date(),
      };

      // WhatsApp notification (sementara di-skip)
      setWaSent(null); // Set ke null agar tidak menampilkan notifikasi

      setCompletedTransaction(receiptData);
      setShowReceipt(true);
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => window.print();

  const handleFinish = () => {
    setShowReceipt(false);
    setCompletedTransaction(null);
    setWaSent(null);
    onPaymentComplete();
    setPaymentMethod('cash');
    setPaymentAmount('');
    setIsProcessing(false);
  };

  const quickAmounts = [50000, 100000, 150000, 200000];

  // Receipt Modal
  if (showReceipt && completedTransaction) {
    return (
      <Modal isOpen={true} onClose={handleFinish} title="Struk Pembayaran" size="md">
        <div className="space-y-4">
          {waSent !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm print:hidden ${
              waSent ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            }`}>
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              {waSent ? '✅ Notifikasi WhatsApp terkirim ke owner' : '⚠️ WhatsApp tidak terkirim (cek pengaturan)'}
            </div>
          )}

          <div id="receipt" className="bg-white p-6 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-center border-b pb-4 mb-4">
              <h2 className="text-xl font-bold">TOKO UMKM</h2>
              <p className="text-sm text-gray-600">Struk Pembayaran</p>
            </div>

            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">No. Transaksi:</span>
                <span className="font-medium">{completedTransaction.transactionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tanggal:</span>
                <span className="font-medium">{formatDateTime(completedTransaction.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Kasir:</span>
                <span className="font-medium">{completedTransaction.cashierName}</span>
              </div>
            </div>

            <div className="border-t border-b py-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Harga</th>
                    <th className="text-right py-1">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTransaction.items.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1">{item.productName}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.price)}</td>
                      <td className="text-right font-medium">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span className="text-blue-600">{formatCurrency(completedTransaction.total)}</span>
              </div>
            </div>

            <div className="border-t pt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Metode:</span>
                <span className="font-medium">
                  {completedTransaction.paymentMethod === 'cash' ? 'Tunai' :
                   completedTransaction.paymentMethod === 'card' ? 'Kartu' : 'E-Wallet'}
                </span>
              </div>
              {completedTransaction.paymentMethod === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bayar:</span>
                    <span>{formatCurrency(completedTransaction.paymentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Kembalian:</span>
                    <span className="font-bold text-green-600">{formatCurrency(completedTransaction.change)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600">Terima kasih atas kunjungan Anda! 🙏</p>
            </div>
          </div>

          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2">
              <Printer className="w-4 h-4" />
              Print Struk
            </Button>
            <Button onClick={handleFinish} className="flex-1">
              Selesai
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Payment Modal
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pembayaran" size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">Ringkasan Pesanan</h4>
          <div className="space-y-1 text-sm">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>{item.name} x{item.quantity}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>
          {cashierName && <p className="text-xs text-gray-500 mt-1">Kasir: {cashierName}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'cash', label: 'Tunai', icon: Banknote },
              { key: 'card', label: 'Kartu', icon: CreditCard },
              { key: 'ewallet', label: 'E-Wallet', icon: Smartphone },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key as 'cash' | 'card' | 'ewallet')}
                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === key ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'cash' && (
          <>
            <div>
              <label htmlFor="paymentAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Jumlah Bayar
              </label>
              <Input
                id="paymentAmount"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPaymentAmount(amount.toString())}
                  className="p-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {formatCurrency(amount)}
                </button>
              ))}
            </div>
            {paymentAmount && (
              <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm text-gray-600">Kembalian</span>
                <span className="text-lg font-bold text-blue-600">
                  {change >= 0 ? formatCurrency(change) : '⚠️ Kurang ' + formatCurrency(Math.abs(change))}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={isProcessing}>
            Batal
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing || (paymentMethod === 'cash' && (!paymentAmount || paidAmount <= 0 || paidAmount < total))}
            className="flex-1"
          >
            {isProcessing ? 'Memproses...' : 'Bayar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};