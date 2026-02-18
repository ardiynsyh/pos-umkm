'use client';

import { ICartItem } from '@/lib/db/dexie';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartViewProps {
  items: ICartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

export function CartView({ items, onUpdateQuantity, onRemoveItem, onClearCart }: CartViewProps) {
  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-lg">Keranjang kosong</p>
          <p className="text-sm">Scan produk untuk memulai</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.nama || 'Produk'}</h3>
                <p className="text-sm text-gray-500">
                  Rp {(item.hargaSatuan || 0).toLocaleString('id-ID')}
                </p>
              </div>
              
              <button
                onClick={() => onRemoveItem(item.id)}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateQuantity(item.id, (item.quantity || 1) - 1)}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Minus className="w-4 h-4" />
                </button>
                
                <span className="w-12 text-center font-medium">
                  {item.quantity || 0}
                </span>
                
                <button
                  onClick={() => onUpdateQuantity(item.id, (item.quantity || 0) + 1)}
                  className="w-8 h-8 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-100"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <p className="font-bold text-gray-900">
                Rp {(item.subtotal || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && (
        <div className="p-4 border-t border-gray-200">
          <Button
            onClick={onClearCart}
            variant="outline"
            className="w-full"
            size="sm"
          >
            Kosongkan Keranjang
          </Button>
        </div>
      )}
    </>
  );
}