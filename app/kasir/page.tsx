'use client';

import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { Navbar } from '@/components/shared/Navbar';
import { useAuthStore } from '@/lib/store/authStore';
import { useState, useEffect } from 'react';
import { db, Product } from '@/lib/db/database';
import { useCart } from '@/hooks/useCart';
import { useBarcodeFocus } from '@/hooks/useBarcodeFocus';
import { ProductList } from '@/components/kasir/ProductList';
import { CartPanel } from '@/components/kasir/CartPanel';
import { PaymentModal } from '@/components/kasir/PaymentModal';
import { Input } from '@/components/ui';
import { Search, Barcode } from 'lucide-react';

export default function KasirPage() {
  const user = useAuthStore((state) => state.user);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  const cart = useCart();

  // Hook untuk auto‑focus barcode input (sudah benar)
  const { inputRef } = useBarcodeFocus({ autoFocusDelay: 2000 });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    const allProducts = await db.products.toArray();
    const validProducts = allProducts.filter(
      (p) => p && p.name && typeof p.name === 'string'
    );
    setProducts(validProducts);
  };

  const loadCategories = async () => {
    const cats = await db.categories.toArray();
    setCategories(['all', ...cats.map((c) => c.name).filter(Boolean)]);
  };

  const filteredProducts = products.filter((product) => {
    if (!product || !product.name) return false;
    const nameMatch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const barcodeMatch = product.barcode
      ? product.barcode.includes(searchQuery)
      : false;
    const matchesSearch = nameMatch || barcodeMatch;
    const matchesCategory =
      selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBarcodeScan = async (barcode: string) => {
    const product = await db.products.where('barcode').equals(barcode).first();
    if (product) {
      cart.addToCart(product);
      setBarcodeInput('');
    } else {
      alert('Produk tidak ditemukan!');
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
                    placeholder="Cari produk..."
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
                  {categories.map((cat) => (
                    <button
                      key={cat}
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
              <ProductList products={filteredProducts} onAddToCart={cart.addToCart} />
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
        cashierName={user?.name}
        onPaymentComplete={() => {
          cart.clearCart();
          setIsPaymentModalOpen(false);
        }}
      />
    </ProtectedRoute>
  );
}