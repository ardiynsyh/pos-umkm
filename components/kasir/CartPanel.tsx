'use client';

import React from 'react';
import { CartItem } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/utils/format';
import { Button } from '@/components/ui';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';

interface CartPanelProps {
  cartItems: CartItem[];
  onUpdateQuantity: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onCheckout: () => void;
  total: number;
}

export const CartPanel: React.FC<CartPanelProps> = ({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  total,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm h-fit sticky top-6">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Keranjang</h2>
          <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
            {cartItems.length} item
          </div>
        </div>
      </div>

      {/* Cart Items */}
      <div className="max-h-96 overflow-y-auto p-4 space-y-3">
        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Keranjang kosong</p>
          </div>
        ) : (
          cartItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm text-gray-800 flex-1">
                  {item.name}
                </h3>
                <button
                  onClick={() => onRemoveItem(item.id!)}
                  className="text-red-500 hover:text-red-700 ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.id!, item.quantity - 1)}
                    className="bg-gray-100 hover:bg-gray-200 p-1 rounded"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id!, item.quantity + 1)}
                    className="bg-gray-100 hover:bg-gray-200 p-1 rounded"
                    disabled={item.quantity >= item.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {formatCurrency(item.price)} x {item.quantity}
                  </p>
                  <p className="font-semibold text-blue-600">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Total & Checkout */}
      <div className="p-4 border-t space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold text-lg">{formatCurrency(total)}</span>
        </div>

        <Button
          onClick={onCheckout}
          disabled={cartItems.length === 0}
          className="w-full"
          size="lg"
        >
          Bayar ({formatCurrency(total)})
        </Button>
      </div>
    </div>
  );
};
