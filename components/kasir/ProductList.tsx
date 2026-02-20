// components/kasir/ProductList.tsx
'use client';

import { Product } from '@/lib/types/product.types';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export function ProductList({ products, onAddToCart }: ProductListProps) {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg p-12 text-center">
        <p className="text-gray-500">Tidak ada produk</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
        >
          {product.image && (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-32 object-cover rounded-lg mb-3"
            />
          )}
          <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
          <p className="text-blue-600 font-bold mb-2">
            Rp {product.price.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Stok: {product.stock}
          </p>
          <button
            onClick={() => onAddToCart(product)}
            disabled={product.stock <= 0}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {product.stock > 0 ? 'Tambah' : 'Stok Habis'}
          </button>
        </div>
      ))}
    </div>
  );
}