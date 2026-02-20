// components/kasir/CartPanel.tsx
'use client';

import { CartItem } from '@/hooks/useCart';
import { Minus, Plus, Trash2 } from 'lucide-react';

interface CartPanelProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  total: number;
}

export function CartPanel({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  total
}: CartPanelProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sticky top-4">
      <h2 className="text-lg font-semibold mb-4">Keranjang Belanja</h2>
      
      {cartItems.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
      ) : (
        <>
          <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-gray-500">
                    Rp {item.price.toLocaleString('id-ID')}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-sm">
                    Rp {item.subtotal.toLocaleString('id-ID')}
                  </p>
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between mb-4">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-blue-600">
                Rp {total.toLocaleString('id-ID')}
              </span>
            </div>
            
            <button
              onClick={onCheckout}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Bayar
            </button>
          </div>
        </>
      )}
    </div>
  );
}