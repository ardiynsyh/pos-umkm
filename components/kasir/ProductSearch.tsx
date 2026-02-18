'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, IProduct } from '@/lib/db/dexie';
import { Package } from 'lucide-react';

interface ProductSearchProps {
  onSelectProduct: (product: IProduct) => void;
}

export function ProductSearch({ onSelectProduct }: ProductSearchProps) {
  const products = useLiveQuery(() => db.products.limit(50).toArray(), []) || [];

  if (products.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg text-gray-600 mb-2">Tidak ada produk</p>
          <p className="text-sm text-gray-400">Klik tombol "Sync Produk" untuk memuat data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left"
          >
            <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            
            <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1">
              {product.nama || 'Produk'}
            </h3>
            
            <p className="text-lg font-bold text-blue-600">
              Rp {(product.hargaJual || 0).toLocaleString('id-ID')}
            </p>
            
            <p className="text-xs text-gray-500 mt-1">
              Stok: {product.stok || 0}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}