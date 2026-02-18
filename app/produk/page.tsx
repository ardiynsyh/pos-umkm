'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { db, Product } from '@/lib/db/database';
import { Button, Input } from '@/components/ui';
import { ProductTable } from '@/components/shared/ProductTable';
import { ProductFormModal } from '@/components/shared/ProductFormModal';
import { Plus, Search } from 'lucide-react';

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const allProducts = await db.products.toArray();
    const validProducts = allProducts.filter(
      (p) => p && p.name && typeof p.name === 'string'
    );
    setProducts(validProducts);
  };

  const filteredProducts = products.filter((product) => {
    if (!product || !product.name) return false;
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode ? product.barcode.includes(searchQuery) : false)
    );
  });

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      await db.products.delete(id);
      loadProducts();
    }
  };

  const handleSave = async () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    loadProducts();
  };

  return (
    <ProtectedRoute>
      <Navbar />
      
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Produk</h1>
            <Button onClick={handleAdd}>
              <Plus className="w-5 h-5 mr-2" />
              Tambah Produk
            </Button>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Cari produk atau barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Product Table */}
          <ProductTable
            products={filteredProducts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* Add/Edit Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSave}
      />
    </ProtectedRoute>
  );
}
