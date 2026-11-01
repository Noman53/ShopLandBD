import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface StockItem {
  productId: string;
  quantity: number;
}

interface InsufficientItem {
  name_bn: string;
  name_en: string;
}

export function useStockManagement() {
  // Check if all items have sufficient stock (variant-aware)
  const checkStock = useCallback(async (items: StockItem[]): Promise<{ valid: boolean; insufficientItems: InsufficientItem[] }> => {
    if (items.length === 0) {
      return { valid: true, insufficientItems: [] };
    }
    
    const productIds = items.map(item => item.productId);
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name_bn, name_en, stock_quantity, is_wearable, has_color_variants')
      .in('id', productIds);

    if (error) {
      console.error('Error checking stock:', error);
      return { valid: false, insufficientItems: [] };
    }

    // Find products that use variants
    const variantProductIds = (products ?? [])
      .filter(p => p.is_wearable || p.has_color_variants)
      .map(p => p.id);

    // Fetch variant stock for those products
    const variantStockMap = new Map<string, number>();
    if (variantProductIds.length > 0) {
      const { data: variantRows } = await supabase
        .from('product_sizes')
        .select('product_id, stock_quantity, is_available')
        .in('product_id', variantProductIds);

      if (variantRows) {
        for (const row of variantRows) {
          if (!row.is_available) continue;
          const current = variantStockMap.get(row.product_id) || 0;
          variantStockMap.set(row.product_id, current + Math.max(0, row.stock_quantity));
        }
      }
    }

    const insufficientItems: InsufficientItem[] = [];
    
    items.forEach(item => {
      const product = products?.find(p => p.id === item.productId);
      if (!product) {
        insufficientItems.push({ name_bn: item.productId, name_en: item.productId });
        return;
      }

      const hasVariants = product.is_wearable || product.has_color_variants;
      const availableStock = hasVariants
        ? (variantStockMap.get(product.id) ?? 0)
        : product.stock_quantity;

      if (availableStock < item.quantity) {
        insufficientItems.push({ name_bn: product.name_bn, name_en: product.name_en });
      }
    });

    return {
      valid: insufficientItems.length === 0,
      insufficientItems,
    };
  }, []);

  // Deduct stock after successful order (variant-aware)
  // NOTE: The DB function process_order_with_stock_check handles atomic deduction.
  // This is a fallback/utility if needed outside that flow.
  const deductStock = useCallback(async (items: StockItem[]): Promise<boolean> => {
    try {
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('id, stock_quantity, is_wearable, has_color_variants')
          .eq('id', item.productId)
          .single();

        if (!product) continue;

        const hasVariants = product.is_wearable || product.has_color_variants;

        if (hasVariants) {
          // Deduct from available variant rows
          const { data: variants } = await supabase
            .from('product_sizes')
            .select('id, stock_quantity')
            .eq('product_id', item.productId)
            .eq('is_available', true)
            .gt('stock_quantity', 0)
            .order('size_order', { ascending: true });

          let remaining = item.quantity;
          for (const v of variants ?? []) {
            if (remaining <= 0) break;
            const deduct = Math.min(v.stock_quantity, remaining);
            await supabase
              .from('product_sizes')
              .update({ stock_quantity: v.stock_quantity - deduct })
              .eq('id', v.id);
            remaining -= deduct;
          }
        } else {
          await supabase
            .from('products')
            .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
            .eq('id', item.productId);
        }
      }
      return true;
    } catch (error) {
      console.error('Stock deduction error:', error);
      return false;
    }
  }, []);

  return {
    checkStock,
    deductStock,
  };
}

// Hook for getting real-time stock status
export function useProductStock(productId: string) {
  const getStock = async (): Promise<number> => {
    const { data, error } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching stock:', error);
      return 0;
    }

    return data?.stock_quantity || 0;
  };

  return { getStock };
}
