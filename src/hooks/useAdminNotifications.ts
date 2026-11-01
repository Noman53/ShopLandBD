import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useCallback, useState } from 'react';

const STORAGE_KEY_ORDERS = 'admin_last_seen_orders';
const STORAGE_KEY_REVIEWS = 'admin_last_seen_reviews';
const STORAGE_KEY_LOW_STOCK = 'admin_last_seen_low_stock';

export function useAdminNotifications() {
  const [lastSeenOrders, setLastSeenOrders] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_ORDERS) || new Date(0).toISOString()
  );
  const [lastSeenReviews, setLastSeenReviews] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_REVIEWS) || new Date(0).toISOString()
  );
  const [lastSeenLowStock, setLastSeenLowStock] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_LOW_STOCK) || ''
  );

  // Count new orders since last seen
  const { data: newOrderCount = 0, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-new-orders-count', lastSeenOrders],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastSeenOrders);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Count pending reviews
  const { data: newReviewCount = 0, refetch: refetchReviews } = useQuery({
    queryKey: ['admin-new-reviews-count', lastSeenReviews],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('product_reviews')
        .select('*', { count: 'exact', head: true })
        .gt('created_at', lastSeenReviews);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000,
  });

  // Count low stock products (stock <= 5)
  const { data: lowStockCount = 0, refetch: refetchLowStock } = useQuery({
    queryKey: ['admin-low-stock-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)
        .eq('is_active', true)
        .lte('stock_quantity', 5);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });

  // Determine visible low stock count (hidden if user marked as read and count hasn't changed)
  const visibleLowStockCount = lastSeenLowStock === String(lowStockCount) ? 0 : lowStockCount;

  const markOrdersSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_ORDERS, now);
    setLastSeenOrders(now);
    refetchOrders();
  }, [refetchOrders]);

  const markReviewsSeen = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_REVIEWS, now);
    setLastSeenReviews(now);
    refetchReviews();
  }, [refetchReviews]);

  const markLowStockSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY_LOW_STOCK, String(lowStockCount));
    setLastSeenLowStock(String(lowStockCount));
  }, [lowStockCount]);

  const markAllAsRead = useCallback(() => {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_ORDERS, now);
    localStorage.setItem(STORAGE_KEY_REVIEWS, now);
    localStorage.setItem(STORAGE_KEY_LOW_STOCK, String(lowStockCount));
    setLastSeenOrders(now);
    setLastSeenReviews(now);
    setLastSeenLowStock(String(lowStockCount));
    refetchOrders();
    refetchReviews();
  }, [refetchOrders, refetchReviews, lowStockCount]);

  // Realtime subscriptions for instant updates
  useEffect(() => {
    const ordersChannel = supabase
      .channel('admin-notify-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        refetchOrders();
      })
      .subscribe();

    const reviewsChannel = supabase
      .channel('admin-notify-reviews')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'product_reviews' }, () => {
        refetchReviews();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reviewsChannel);
    };
  }, [refetchOrders, refetchReviews]);

  return {
    newOrderCount,
    newReviewCount,
    lowStockCount: visibleLowStockCount,
    markOrdersSeen,
    markReviewsSeen,
    markLowStockSeen,
    markAllAsRead,
    totalNotifications: newOrderCount + newReviewCount + visibleLowStockCount,
  };
}
