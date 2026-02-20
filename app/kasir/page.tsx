'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useAuthStore } from '@/lib/store/authStore';
import { useState, useEffect } from 'react';
import { useCart } from '@/hooks/useCart';
import { useBarcodeFocus } from '@/hooks/useBarcodeFocus';
import { ProductList } from '@/components/kasir/ProductList';
import { CartPanel } from '@/components/kasir/CartPanel';
import { PaymentModal } from '@/components/kasir/PaymentModal';
import { Input } from '@/components/ui';
import { Search, Barcode } from 'lucide-react';
import { Product, mapPrismaProduct } from '@/lib/types/product.types';

export default function KasirPage() {
  const user = useAuthStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const cart = useCart();
  const { inputRef } = useBarcodeFocus({ autoFocusDelay: 2000 });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Gagal fetch produk');
      const data = await res.json();

      // Mapping dari Prisma ke format Product menggunakan helper
      const mapped: Product[] = (data.products ?? []).map((p: any) => mapPrismaProduct(p));

      setProducts(mapped);

      // Ambil kategori unik
      const uniqueCats = Array.from(
        new Set(mapped.map((p) => p.category || 'Umum').filter(Boolean))
      );
      setCategories(['all', ...uniqueCats]);
    } catch (error) {
      console.error('Gagal load produk:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const nameMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const barcodeMatch = product.barcode ? product.barcode.includes(searchQuery) : false;
    const skuMatch = product.sku ? product.sku.includes(searchQuery) : false;
    const matchesSearch = nameMatch || barcodeMatch || skuMatch;
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(barcode)}`);
      const data = await res.json();

      if (data.product) {
        const p = data.product;
        const productToAdd = mapPrismaProduct(p);
        cart.addToCart(productToAdd);
        setBarcodeInput('');
      } else {
        alert('Produk tidak ditemukan!');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      alert('Gagal mencari produk');
    }
  };

  const handleCheckout = () => {
    if (cart.cartItems.length === 0) {
      alert('Keranjang kosong!');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <Navbar />

      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Panel - Products */}
            <div className="lg:col-span-2 space-y-4">

              {/* Search and Barcode */}
              <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Cari produk (nama/barcode/SKU)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    ref={inputRef}
                    id="barcode-input"
                    type="text"
                    placeholder="Scan barcode atau ketik manual..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && barcodeInput) {
                        handleBarcodeScan(barcodeInput);
                      }
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat, index) => (
                    <button
                      key={`category-${index}-${cat}`}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'all' ? 'Semua' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Product List */}
              {loading ? (
                <div className="bg-white rounded-lg p-12 text-center">
                  <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Memuat produk...</p>
                </div>
              ) : (
                <ProductList
                  products={filteredProducts}
                  onAddToCart={cart.addToCart}
                />
              )}
            </div>

            {/* Right Panel - Cart */}
            <div className="lg:col-span-1">
              <CartPanel
                cartItems={cart.cartItems}
                onUpdateQuantity={cart.updateQuantity}
                onRemoveItem={cart.removeFromCart}
                onCheckout={handleCheckout}
                total={cart.getCartTotal()}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        cartItems={cart.cartItems}
        total={cart.getCartTotal()}
        cashierName={user?.nama}
        onPaymentComplete={() => {
          cart.clearCart();
          setIsPaymentModalOpen(false);
          loadProducts(); // refresh stok setelah transaksi
        }}
      />
    </ProtectedRoute>
  );
}