// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Multi-Provider Integration
// Supports: Fonnte | CallMeBot | WA Business Cloud API (Meta)
// ─────────────────────────────────────────────────────────────────────────────

import { Transaction } from '@/lib/db/database';
import { formatCurrency, formatDateTime } from './format';

export interface WABusinessConfig {
  provider: 'fonnte' | 'callmebot' | 'wabusiness';
  // Fonnte / CallMeBot
  apiKey?: string;
  ownerPhone?: string;
  // WA Business Cloud API (Meta)
  accessToken?: string;
  phoneNumberId?: string;
  recipientPhone?: string;
  enabled: boolean;
}

// ─── FORMAT PESAN ────────────────────────────────────────────────────────────

export const formatTransactionMessage = (
  transaction: Transaction,
  storeName: string = 'Toko UMKM'
): string => {
  const itemLines = transaction.items
    .map(
      (item) =>
        `  • ${item.productName} x${item.quantity} = ${formatCurrency(item.subtotal)}`
    )
    .join('\n');

  const paymentLabel =
    transaction.paymentMethod === 'cash'
      ? 'Tunai'
      : transaction.paymentMethod === 'card'
      ? 'Kartu'
      : 'E-Wallet';

  let message = `🛒 *NOTIFIKASI PENJUALAN*\n`;
  message += `🏪 ${storeName}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `📋 No: ${transaction.transactionNumber}\n`;
  message += `📅 ${formatDateTime(transaction.createdAt)}\n`;
  message += `👤 Kasir: ${transaction.cashierName || 'Kasir'}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `*Item Pembelian:*\n${itemLines}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `💰 Total: *${formatCurrency(transaction.total)}*\n`;
  message += `💳 Metode: ${paymentLabel}\n`;
  if (transaction.paymentMethod === 'cash') {
    message += `💵 Bayar: ${formatCurrency(transaction.paymentAmount)}\n`;
    message += `💱 Kembalian: ${formatCurrency(transaction.change)}\n`;
  }
  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `✅ Transaksi berhasil!`;
  return message;
};

// ─── FONNTE ──────────────────────────────────────────────────────────────────

const sendViaFonnte = async (
  phone: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: phone, message, countryCode: '62' }),
    });
    const data = await res.json();
    return data.status === true
      ? { success: true, message: 'Notifikasi WhatsApp berhasil dikirim via Fonnte ✅' }
      : { success: false, message: `Gagal kirim: ${data.reason || 'Unknown error'}` };
  } catch (error) {
    console.error('Fonnte error:', error);
    return { success: false, message: 'Gagal terhubung ke Fonnte API' };
  }
};

// ─── CALLMEBOT ───────────────────────────────────────────────────────────────

const sendViaCallMeBot = async (
  phone: string,
  message: string,
  apiKey: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const cleanPhone = phone.startsWith('62') ? '0' + phone.slice(2) : phone;
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    return text.includes('Message Sent')
      ? { success: true, message: 'Notifikasi WhatsApp berhasil dikirim via CallMeBot ✅' }
      : { success: false, message: 'Gagal kirim via CallMeBot. Cek nomor & API Key.' };
  } catch (error) {
    console.error('CallMeBot error:', error);
    return { success: false, message: 'Gagal terhubung ke CallMeBot API' };
  }
};

// ─── WA BUSINESS CLOUD API (META) ────────────────────────────────────────────

const sendViaWABusiness = async (
  recipientPhone: string,
  message: string,
  accessToken: string,
  phoneNumberId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const cleanPhone = recipientPhone
      .replace(/\+/g, '')
      .replace(/\s/g, '')
      .replace(/^0/, '62');

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      }
    );

    const data = await res.json();
    if (data.messages?.[0]?.id) {
      return { success: true, message: 'Notifikasi WhatsApp berhasil dikirim via WA Business API ✅' };
    }
    return {
      success: false,
      message: `WA Business Error: ${data.error?.message || 'Unknown'}`,
    };
  } catch (err: any) {
    return { success: false, message: `Koneksi gagal: ${err.message}` };
  }
};

// ─── MAIN SEND ────────────────────────────────────────────────────────────────

export const sendWhatsAppNotification = async (
  transaction: Transaction,
  storeName?: string
): Promise<{ success: boolean; message: string }> => {
  const configStr = localStorage.getItem('waConfig');
  if (!configStr) return { success: false, message: 'WhatsApp belum dikonfigurasi' };

  let config: WABusinessConfig;
  try {
    config = JSON.parse(configStr);
  } catch {
    return { success: false, message: 'Konfigurasi WhatsApp tidak valid' };
  }

  if (!config.enabled)
    return { success: false, message: 'WhatsApp notification dinonaktifkan' };

  const message = formatTransactionMessage(transaction, storeName);

  switch (config.provider) {
    case 'fonnte':
      if (!config.ownerPhone || !config.apiKey)
        return { success: false, message: 'Nomor atau API Key Fonnte kosong' };
      return sendViaFonnte(config.ownerPhone, message, config.apiKey);

    case 'callmebot':
      if (!config.ownerPhone || !config.apiKey)
        return { success: false, message: 'Nomor atau API Key CallMeBot kosong' };
      return sendViaCallMeBot(config.ownerPhone, message, config.apiKey);

    case 'wabusiness':
      if (!config.accessToken || !config.phoneNumberId || !config.recipientPhone)
        return { success: false, message: 'Access Token / Phone Number ID / Nomor kosong' };
      return sendViaWABusiness(
        config.recipientPhone,
        message,
        config.accessToken,
        config.phoneNumberId
      );

    default:
      return { success: false, message: 'Provider tidak dikenal' };
  }
};

// ─── SAVE / LOAD CONFIG ───────────────────────────────────────────────────────

export const saveWAConfig = (config: WABusinessConfig): void => {
  localStorage.setItem('waConfig', JSON.stringify(config));
};

export const loadWAConfig = (): WABusinessConfig => {
  try {
    const str = localStorage.getItem('waConfig');
    return str
      ? JSON.parse(str)
      : { provider: 'fonnte', apiKey: '', ownerPhone: '', enabled: false };
  } catch {
    return { provider: 'fonnte', apiKey: '', ownerPhone: '', enabled: false };
  }
};
