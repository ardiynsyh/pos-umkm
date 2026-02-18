'use client';

import { useState } from 'react';
import { Product } from '@/lib/db/database';

export interface CartItem extends Product {
  quantity: number;
  subtotal: number;
}

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    setCartItems((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      
      if (existingItem) {
        return prev.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        );
      } else {
        return [
          ...prev,
          {
            ...product,
            quantity: 1,
            subtotal: product.price,
          },
        ];
      }
    });
  };

  const removeFromCart = (productId: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.price,
            }
          : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  // ← PASTIKAN FUNCTION INI ADA!
  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.subtotal, 0);
  };

  // ← PASTIKAN FUNCTION INI ADA!
  const getItemCount = () => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  // ← PASTIKAN SEMUA FUNCTION DI-RETURN!
  return {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,    // ← HARUS ADA
    getItemCount,    // ← HARUS ADA
  };
};