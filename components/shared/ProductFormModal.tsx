'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { db, Product } from '@/lib/db/database';
import { ImageUpload } from '@/components/shared/ImageUpload';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    price: '',
    stock: '',
    category: '',
    image: null as string | null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        barcode: product.barcode || '',
        price: product.price.toString(),
        stock: product.stock.toString(),
        category: product.category || '',
        image: (product as any).image || null,
      });
    } else {
      setFormData({
        name: '',
        barcode: '',
        price: '',
        stock: '',
        category: '',
        image: null,
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama produk harus diisi';
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Harga harus lebih dari 0';
    }

    if (!formData.stock || parseInt(formData.stock) < 0) {
      newErrors.stock = 'Stok tidak valid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSaving(true);

    try {
      const productData = {
        name: formData.name.trim(),
        barcode: formData.barcode.trim() || undefined,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        category: formData.category.trim() || undefined,
        image: formData.image || undefined,
        updatedAt: new Date(),
      };

      if (product?.id) {
        await db.products.update(product.id, productData);
      } else {
        await db.products.add({
          ...productData,
          createdAt: new Date(),
        });
      }

      onSave();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Terjadi kesalahan saat menyimpan produk');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? 'Edit Produk' : 'Tambah Produk'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Foto Produk */}
        <ImageUpload
          value={formData.image || undefined}
          onChange={(base64) => setFormData({ ...formData, image: base64 })}
          label="Foto Produk (opsional)"
        />

        {/* Nama Produk */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nama Produk *
          </label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masukkan nama produk"
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Barcode */}
        <div>
          <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <Input
            id="barcode"
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Scan atau ketik barcode"
          />
        </div>

        {/* Kategori */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Kategori
          </label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            placeholder="Contoh: Makanan, Minuman"
          />
        </div>

        {/* Harga & Stok */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
              Harga Jual *
            </label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
            <p className="text-xs text-gray-400 mt-1">💰 Harga per satuan (Rp)</p>
          </div>

          <div>
            <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Stok *
            </label>
            <Input
              id="stock"
              type="number"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder="0"
            />
            {errors.stock && <p className="text-sm text-red-600 mt-1">{errors.stock}</p>}
            <p className="text-xs text-gray-400 mt-1">📦 Total unit tersedia</p>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Batal
          </Button>
          <Button type="submit" disabled={isSaving} className="flex-1">
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};