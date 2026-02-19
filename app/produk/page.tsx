'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useState, useEffect } from 'react';
import { Product } from '@/lib/db/database';
import { Button, Input } from '@/components/ui';
import { ProductTable } from '@/components/shared/ProductTable';
import { ProductFormModal } from '@/components/shared/ProductFormModal';
import { Plus, Search } from 'lucide-react';

// Helper: mapping produk dari Prisma ke format Product Dexie
function mapPrismaToProduct(p: any): Product {
  return {
    id: p.id,                          // string dari Prisma
    name: p.nama,
    barcode: p.barcode ?? '',
    price: p.hargaJual,
    stock: p.stok,
    category: p.category?.nama ?? 'Umum',
    image: p.foto ?? undefined,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  } as unknown as Product;
}

export default function ProdukPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal fetch produk');
      const data = await res.json();
      const mapped = (data.products ?? []).map(mapPrismaToProduct);
      setProducts(mapped);
    } catch (error) {
      console.error('Gagal load produk:', error);
    } finally {
      setLoading(false);
    }
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

  const handleDelete = async (id: number | string) => {
    if (confirm('Apakah Anda yakin ingin menghapus produk ini?')) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Gagal hapus produk');
        loadProducts();
      } catch (error) {
        console.error('Gagal hapus produk:', error);
        alert('Terjadi kesalahan saat menghapus produk');
      }
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

          {/* Loading state */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Memuat produk...</p>
            </div>
          ) : (
            <ProductTable
              products={filteredProducts}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
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
