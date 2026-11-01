import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type ProductLike = {
  id: string;
  stock_quantity: number;
  is_wearable?: boolean | null;
  has_color_variants?: boolean | null;
};

type VariantRow = {
  product_id: string;
  stock_quantity: number;
  is_available: boolean;
  color_id: string | null;
};

function sumAvailable(rows: VariantRow[]) {
  return rows.reduce((sum, r) => {
    if (!r.is_available) return sum;
    const qty = Number(r.stock_quantity) || 0;
    return sum + Math.max(0, qty);
  }, 0);
}

/**
 * Computes stock per product from variant stock (product_sizes) when a product has variants.
 * This keeps existing UI components unchanged by feeding them a corrected stock number.
 */
export function useComputedProductStock(products?: ProductLike[]) {
  const productIds = useMemo(() => (products ?? []).map((p) => p.id), [products]);
  const queryClient = useQueryClient();

  // IMPORTANT: channel names must be unique per hook instance.
  // Otherwise, unmounting one page/component can remove the shared channel
  // and break real-time stock updates elsewhere.
  const channelName = useMemo(
    () => `variant-stock-changes-${Math.random().toString(36).slice(2)}`,
    []
  );

  const shouldCompute = useMemo(() => {
    return (products ?? []).some((p) => Boolean(p.is_wearable) || Boolean(p.has_color_variants));
  }, [products]);

  const { data: variantRows } = useQuery({
    queryKey: ['variant-stock', productIds],
    enabled: shouldCompute && productIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('product_id, stock_quantity, is_available, color_id')
        .in('product_id', productIds);

      if (error) throw error;
      return (data ?? []) as VariantRow[];
    },
    staleTime: 10_000,
  });

  // Real-time sync for product_sizes changes
  useEffect(() => {
    if (!shouldCompute || productIds.length === 0) return;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_sizes',
        },
        (payload) => {
          // Check if the change is for a product we care about
          const changedProductId = (payload.new as any)?.product_id || (payload.old as any)?.product_id;
          if (changedProductId && productIds.includes(changedProductId)) {
            // Avoid relying on a shared channel + refetch closures.
            // Invalidating keeps React Query in control and works across pages.
            queryClient.invalidateQueries({ queryKey: ['variant-stock', productIds] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, productIds, queryClient, shouldCompute]);

  const stockByProductId = useMemo(() => {
    const base = new Map<string, number>();
    (products ?? []).forEach((p) => base.set(p.id, Number(p.stock_quantity) || 0));

    if (!variantRows || variantRows.length === 0) return base;

    const rowsByProduct = new Map<string, VariantRow[]>();
    for (const row of variantRows) {
      const arr = rowsByProduct.get(row.product_id) ?? [];
      arr.push(row);
      rowsByProduct.set(row.product_id, arr);
    }

    for (const p of products ?? []) {
      const hasVariants = Boolean(p.is_wearable) || Boolean(p.has_color_variants);
      if (!hasVariants) continue;
      const rows = rowsByProduct.get(p.id) ?? [];
      base.set(p.id, sumAvailable(rows));
    }

    return base;
  }, [products, variantRows]);

  const colorStockByProductId = useMemo(() => {
    // productId -> colorId -> stock
    const map = new Map<string, Map<string, number>>();
    if (!variantRows) return map;

    for (const row of variantRows) {
      if (!row.color_id || !row.is_available) continue;
      const qty = Math.max(0, Number(row.stock_quantity) || 0);

      const byColor = map.get(row.product_id) ?? new Map<string, number>();
      byColor.set(row.color_id, (byColor.get(row.color_id) ?? 0) + qty);
      map.set(row.product_id, byColor);
    }
    return map;
  }, [variantRows]);

  return {
    stockByProductId,
    colorStockByProductId,
  };
}
