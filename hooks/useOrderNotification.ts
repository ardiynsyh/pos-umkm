// hooks/useOrderNotification.ts
'use client';

import { useState, useEffect, useCallback } from 'react';

interface OrderNotification {
  id: string;
  orderNumber: string;
  tableNumber?: number;
  customerName?: string;
  totalAmount: number;
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  createdAt: string;
}

interface UseOrderNotificationProps {
  pollingInterval?: number; // dalam milidetik, default 30 detik
  outletId?: string;
  onNewOrder?: (order: OrderNotification) => void;
}

export const useOrderNotification = ({
  pollingInterval = 30000,
  outletId,
  onNewOrder
}: UseOrderNotificationProps = {}) => {
  const [newOrders, setNewOrders] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastCheck, setLastCheck] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkNewOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Bangun URL dengan parameter
      const params = new URLSearchParams();
      if (lastCheck) params.append('lastCheck', lastCheck);
      if (outletId) params.append('outletId', outletId);

      const res = await fetch(`/api/orders/new-orders?${params.toString()}`);
      
      if (!res.ok) throw new Error('Gagal cek pesanan');

      const data = await res.json();
      
      if (data.success) {
        // Update lastCheck
        setLastCheck(data.lastCheck);

        // Update unread count
        setUnreadCount(data.total);

        // Jika ada pesanan baru, tambahkan ke state
        if (data.newOrders?.length > 0) {
          setNewOrders(prev => [...data.newOrders, ...prev]);
          
          // Panggil callback untuk setiap pesanan baru
          data.newOrders.forEach((order: any) => {
            if (onNewOrder) {
              onNewOrder({
                id: order.id,
                orderNumber: order.orderNumber,
                tableNumber: order.table?.number,
                customerName: order.customerName,
                totalAmount: order.totalAmount,
                items: order.items.map((item: any) => ({
                  productName: item.productName,
                  quantity: item.quantity
                })),
                createdAt: order.createdAt
              });
            }
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [lastCheck, outletId, onNewOrder]);

  const markAsRead = async (orderIds: string[]) => {
    try {
      const res = await fetch('/api/orders/new-orders/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds })
      });

      if (res.ok) {
        // Hapus dari state atau kurangi unreadCount
        setUnreadCount(prev => Math.max(0, prev - orderIds.length));
        setNewOrders(prev => prev.filter(order => !orderIds.includes(order.id)));
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllAsRead = () => {
    const orderIds = newOrders.map(order => order.id);
    if (orderIds.length > 0) {
      markAsRead(orderIds);
    }
  };

  // Polling untuk cek pesanan baru
  useEffect(() => {
    // Cek pertama kali
    checkNewOrders();

    // Setup interval polling
    const intervalId = setInterval(checkNewOrders, pollingInterval);

    // Cleanup interval
    return () => clearInterval(intervalId);
  }, [checkNewOrders, pollingInterval]);

  return {
    newOrders,
    unreadCount,
    isLoading,
    error,
    checkNewOrders,
    markAsRead,
    markAllAsRead
  };
};