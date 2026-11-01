import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  minimum_order_value: number | null;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  is_active: boolean;
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: async ({ code, orderTotal }: { code: string; orderTotal: number }) => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error('INVALID_COUPON');
      }

      const coupon = data as Coupon;

      // Check expiry
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        throw new Error('COUPON_EXPIRED');
      }

      // Check usage limit
      if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
        throw new Error('COUPON_LIMIT_REACHED');
      }

      // Check minimum order value
      if (coupon.minimum_order_value && orderTotal < coupon.minimum_order_value) {
        throw new Error(`MIN_ORDER_${coupon.minimum_order_value}`);
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (orderTotal * coupon.discount_value) / 100;
      } else {
        discountAmount = Math.min(coupon.discount_value, orderTotal);
      }

      return {
        coupon,
        discountAmount,
        finalTotal: orderTotal - discountAmount,
      };
    },
  });
}

export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (couponId: string) => {
      // Get current usage count
      const { data: coupon, error: fetchError } = await supabase
        .from('coupons')
        .select('used_count')
        .eq('id', couponId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Increment the usage count
      const { error: updateError } = await supabase
        .from('coupons')
        .update({ used_count: (coupon?.used_count || 0) + 1 })
        .eq('id', couponId);
        
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
    },
  });
}
