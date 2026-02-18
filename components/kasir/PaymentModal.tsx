'use client';

import React, { useState } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { CartItem } from '@/hooks/useCart';
import { db, TransactionItem, Transaction } from '@/lib/db/database';
import { formatCurrency, generateTransactionNumber, formatDateTime } from '@/lib/utils/format';
import { speakIndonesian, voiceMessages } from '@/lib/utils/voice';
import { sendWhatsAppNotification } from '@/lib/utils/whatsapp';
import { Banknote, CreditCard, Smartphone, Printer, MessageCircle } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  total: number;
  cashierName?: string;
  onPaymentComplete: () => void;
}

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
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [waSent, setWaSent] = useState<boolean | null>(null);

  const change = parseFloat(paymentAmount) - total;

  const handlePayment = async () => {
    if (paymentMethod === 'cash' && change < 0) {
      alert('Jumlah pembayaran kurang!');
      return;
    }

    setIsProcessing(true);

    try {
      const transactionItems: TransactionItem[] = cartItems.map((item) => ({
        productId: item.id!,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
      }));

      const transaction: Transaction = {
        transactionNumber: generateTransactionNumber(),
        items: transactionItems,
        subtotal: total,
        tax: 0,
        discount: 0,
        total,
        paymentMethod,
        paymentAmount: parseFloat(paymentAmount) || total,
        change: paymentMethod === 'cash' ? Math.max(0, change) : 0,
        cashierName: cashierName || 'Kasir',
        createdAt: new Date(),
      };

      const transactionId = await db.transactions.add(transaction);
      transaction.id = transactionId as number;

      // Update stock
      for (const item of cartItems) {
        const product = await db.products.get(item.id!);
        if (product) {
          await db.products.update(item.id!, {
            stock: product.stock - item.quantity,
            updatedAt: new Date(),
          });
        }
      }

      // ── Voice Notification ───────────────────────────────
      if (paymentMethod === 'cash' && change > 0) {
        speakIndonesian(voiceMessages.paymentCash(total, change));
      } else {
        speakIndonesian(voiceMessages.paymentSuccess(total));
      }

      // ── WhatsApp Notification ────────────────────────────
      const storeName =
        (await db.settings.where('key').equals('storeName').first())?.value ||
        'Toko UMKM';

      const waResult = await sendWhatsAppNotification(transaction, storeName);
      setWaSent(waResult.success);
      if (!waResult.success && waResult.message !== 'WhatsApp belum dikonfigurasi' && waResult.message !== 'WhatsApp notification dinonaktifkan') {
        console.warn('WA:', waResult.message);
      }

      setCompletedTransaction(transaction);
      setShowReceipt(true);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleFinish = () => {
    setShowReceipt(false);
    setCompletedTransaction(null);
    setWaSent(null);
    onPaymentComplete();
    resetForm();
    setIsProcessing(false);
  };

  const resetForm = () => {
    setPaymentMethod('cash');
    setPaymentAmount('');
  };

  const quickAmounts = [50000, 100000, 150000, 200000];

  // ── Receipt Modal ─────────────────────────────────────────────────────────
  if (showReceipt && completedTransaction) {
    return (
      <Modal isOpen={true} onClose={handleFinish} title="Struk Pembayaran" size="md">
        <div className="space-y-4">
          {/* WA Status */}
          {waSent !== null && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                waSent
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}
            >
              <MessageCircle className="w-4 h-4 flex-shrink-0" />
              {waSent
                ? '✅ Notifikasi WhatsApp terkirim ke owner'
                : '⚠️ WhatsApp tidak terkirim (cek pengaturan)'}
            </div>
          )}

          {/* Receipt Content */}
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

          <div className="flex gap-2">
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

  // ── Payment Modal ─────────────────────────────────────────────────────────
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
          {cashierName && (
            <p className="text-xs text-gray-500 mt-1">Kasir: {cashierName}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Metode Pembayaran
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'cash', label: 'Tunai', icon: Banknote },
              { key: 'card', label: 'Kartu', icon: CreditCard },
              { key: 'ewallet', label: 'E-Wallet', icon: Smartphone },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPaymentMethod(key as any)}
                className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 transition-colors ${
                  paymentMethod === key
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 hover:border-gray-300'
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
                  {change >= 0 ? formatCurrency(change) : '⚠️ Kurang'}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button
            onClick={handlePayment}
            disabled={isProcessing || (paymentMethod === 'cash' && change < 0)}
            className="flex-1"
          >
            {isProcessing ? 'Memproses...' : 'Bayar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};