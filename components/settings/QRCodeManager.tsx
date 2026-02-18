'use client';

import React, { useState, useEffect } from 'react';
import { db, PaymentQR } from '@/lib/db/database';
import { Card, Button, Modal, Input } from '@/components/ui';
import { ImageUpload } from '@/components/shared/ImageUpload';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const QRCodeManager = () => {
  const [qrCodes, setQRCodes] = useState<PaymentQR[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<PaymentQR | null>(null);
  const [formData, setFormData] = useState({
    provider: 'BCA' as 'BCA' | 'DANA' | 'OVO' | 'GOPAY',
    qrCode: '',
    accountNumber: '',
    accountName: '',
  });

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    const codes = await db.paymentQRs.toArray();
    setQRCodes(codes);
  };

  const handleSave = async () => {
    if (editingQR?.id) {
      await db.paymentQRs.update(editingQR.id, {
        provider: formData.provider,
        qrCode: formData.qrCode,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        updatedAt: new Date(),
      });
    } else {
      await db.paymentQRs.add({
        provider: formData.provider,
        qrCode: formData.qrCode,
        accountNumber: formData.accountNumber,
        accountName: formData.accountName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    setIsModalOpen(false);
    resetForm();
    loadQRCodes();
  };

  const toggleActive = async (id: number, currentStatus: boolean) => {
    await db.paymentQRs.update(id, {
      isActive: !currentStatus,
      updatedAt: new Date(),
    });
    loadQRCodes();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus QR Code ini?')) {
      await db.paymentQRs.delete(id);
      loadQRCodes();
    }
  };

  const resetForm = () => {
    setFormData({
      provider: 'BCA',
      qrCode: '',
      accountNumber: '',
      accountName: '',
    });
    setEditingQR(null);
  };

  const providerColors = {
    BCA: 'bg-blue-100 text-blue-800',
    DANA: 'bg-cyan-100 text-cyan-800',
    OVO: 'bg-purple-100 text-purple-800',
    GOPAY: 'bg-green-100 text-green-800',
  };

  return (
    <Card title="QR Code Pembayaran">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tambah QR Code
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {qrCodes.map((qr) => (
            <div key={qr.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    providerColors[qr.provider]
                  }`}
                >
                  {qr.provider}
                </span>
                <button
                  onClick={() => toggleActive(qr.id!, qr.isActive)}
                  className={`text-xs px-2 py-1 rounded ${
                    qr.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {qr.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>

              {qr.qrCode && (
                <img
                  src={qr.qrCode}
                  alt={qr.provider}
                  className="w-full aspect-square object-contain mb-3 bg-gray-50 rounded"
                />
              )}

              <div className="text-sm text-gray-600 mb-3">
                <p className="font-medium">{qr.accountName}</p>
                <p className="text-xs">{qr.accountNumber}</p>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setEditingQR(qr);
                    setFormData({
                      provider: qr.provider,
                      qrCode: qr.qrCode,
                      accountNumber: qr.accountNumber || '',
                      accountName: qr.accountName || '',
                    });
                    setIsModalOpen(true);
                  }}
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDelete(qr.id!)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingQR ? 'Edit QR Code' : 'Tambah QR Code'}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-2">
              Provider
            </label>
            <select
              id="provider"
              value={formData.provider}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  provider: e.target.value as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BCA">BCA</option>
              <option value="DANA">DANA</option>
              <option value="OVO">OVO</option>
              <option value="GOPAY">GOPAY</option>
            </select>
          </div>

          <ImageUpload
            label="QR Code Image"
            value={formData.qrCode}
            onChange={(base64) =>
              setFormData({ ...formData, qrCode: base64 || '' })
            }
          />

          <div>
            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Nomor Rekening/HP
            </label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) =>
                setFormData({ ...formData, accountNumber: e.target.value })
              }
              placeholder="0812345678"
            />
          </div>

          <div>
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
              Nama Pemilik
            </label>
            <Input
              id="accountName"
              value={formData.accountName}
              onChange={(e) =>
                setFormData({ ...formData, accountName: e.target.value })
              }
              placeholder="Nama Toko"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
              className="flex-1"
            >
              Batal
            </Button>
            <Button onClick={handleSave} className="flex-1">
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
};