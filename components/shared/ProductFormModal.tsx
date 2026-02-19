'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@/components/ui';
import { ImageUpload } from '@/components/shared/ImageUpload';

interface Category {
  id: string;
  nama: string;
}

interface ProductFormData {
  id?: string;
  name: string;
  barcode: string;
  price: string;
  stock: string;
  categoryId: string;
  image: string | null;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any | null;
  onSave: () => void;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  product,
  onSave,
}) => {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    barcode: '',
    price: '',
    stock: '',
    categoryId: '',
    image: null,
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load kategori dari API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch('/api/categories');
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories ?? data);
        }
      } catch (error) {
        console.error('Gagal load kategori:', error);
      }
    };
    loadCategories();
  }, []);

  // Isi form saat edit
  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.nama ?? product.name ?? '',
        barcode: product.barcode ?? '',
        price: String(product.hargaJual ?? product.price ?? ''),
        stock: String(product.stok ?? product.stock ?? ''),
        categoryId: product.categoryId ?? '',
        image: product.foto ?? product.image ?? null,
      });
    } else {
      setFormData({
        name: '',
        barcode: '',
        price: '',
        stock: '',
        categoryId: '',
        image: null,
      });
    }
    setErrors({});
  }, [product, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama produk harus diisi';
    if (!formData.price || parseFloat(formData.price) <= 0) newErrors.price = 'Harga harus lebih dari 0';
    if (!formData.stock || parseInt(formData.stock) < 0) newErrors.stock = 'Stok tidak valid';
    if (!formData.categoryId) newErrors.categoryId = 'Kategori harus dipilih';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      const payload = {
        nama: formData.name.trim(),
        barcode: formData.barcode.trim() || null,
        hargaJual: parseFloat(formData.price),
        stok: parseInt(formData.stock),
        categoryId: formData.categoryId,
        foto: formData.image || null,
      };

      let res: Response;

      if (formData.id) {
        // Update produk
        res = await fetch(`/api/products/${formData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Tambah produk baru
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan produk');
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Terjadi kesalahan saat menyimpan produk');
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
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nama Produk *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Masukkan nama produk"
          />
          {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Barcode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barcode
          </label>
          <Input
            value={formData.barcode}
            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
            placeholder="Scan atau ketik barcode"
          />
        </div>

        {/* Kategori */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori *
          </label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Pilih Kategori --</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.nama}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="text-sm text-red-600 mt-1">{errors.categoryId}</p>}
        </div>

        {/* Harga & Stok */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Harga Jual *
            </label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0"
            />
            {errors.price && <p className="text-sm text-red-600 mt-1">{errors.price}</p>}
            <p className="text-xs text-gray-400 mt-1">💰 Harga per satuan (Rp)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jumlah Stok *
            </label>
            <Input
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
