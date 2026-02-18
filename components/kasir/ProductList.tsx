'use client';

import React from 'react';
import { Product } from '@/lib/db/database';
import { formatCurrency } from '@/lib/utils/format';
import { Plus, Package } from 'lucide-react';

interface ProductListProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export const ProductList: React.FC<ProductListProps> = ({ products, onAddToCart }) => {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Tidak ada produk ditemukan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => onAddToCart(product)}
          >
            <div className="aspect-square bg-gray-100 rounded-md mb-2 flex items-center justify-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                <Package className="w-12 h-12 text-gray-400" />
              )}
            </div>

            <h3 className="font-medium text-sm text-gray-800 mb-1 line-clamp-2 h-10">
              {product.name}
            </h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 font-semibold text-sm">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-gray-500">Stok: {product.stock}</p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product);
                }}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
