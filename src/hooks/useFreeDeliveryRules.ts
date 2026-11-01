import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FreeDeliveryRule {
  id: string;
  name_bn: string;
  name_en: string;
  is_active: boolean;
  applies_to: 'all' | 'selected';
  delivery_area: 'dhaka' | 'outside_dhaka' | 'both';
  trigger_type: 'min_amount' | 'coupon';
  min_order_amount: number;
  coupon_code: string | null;
  product_ids: string[];
  created_at: string;
  updated_at: string;
}

export function useFreeDeliveryRules() {
  return useQuery({
    queryKey: ['free-delivery-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('free_delivery_rules' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as FreeDeliveryRule[];
    },
  });
}

export function useActiveFreeDeliveryRules() {
  return useQuery({
    queryKey: ['active-free-delivery-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('free_delivery_rules' as any)
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data as unknown as FreeDeliveryRule[];
    },
  });
}

export function useCreateFreeDeliveryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Omit<FreeDeliveryRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('free_delivery_rules' as any)
        .insert(rule as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-delivery-rules'] });
      queryClient.invalidateQueries({ queryKey: ['active-free-delivery-rules'] });
    },
  });
}

export function useUpdateFreeDeliveryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase
        .from('free_delivery_rules' as any)
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-delivery-rules'] });
      queryClient.invalidateQueries({ queryKey: ['active-free-delivery-rules'] });
    },
  });
}

export function useDeleteFreeDeliveryRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('free_delivery_rules' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['free-delivery-rules'] });
      queryClient.invalidateQueries({ queryKey: ['active-free-delivery-rules'] });
    },
  });
}

/** Check if free delivery applies for a given order context */
export function checkFreeDelivery(
  rules: FreeDeliveryRule[],
  orderTotal: number,
  isDhaka: boolean,
  appliedCouponCode: string | null,
  cartProductIds: string[]
): boolean {
  if (!rules || rules.length === 0) return false;

  for (const rule of rules) {
    if (!rule.is_active) continue;

    // Check delivery area
    if (rule.delivery_area === 'dhaka' && !isDhaka) continue;
    if (rule.delivery_area === 'outside_dhaka' && isDhaka) continue;
    // 'both' always matches

    // Check trigger
    if (rule.trigger_type === 'min_amount' && orderTotal >= rule.min_order_amount) {
      // Check product scope
      if (rule.applies_to === 'all') return true;
      if (rule.applies_to === 'selected' && rule.product_ids?.length > 0) {
        const hasMatchingProduct = cartProductIds.some(pid => rule.product_ids.includes(pid));
        if (hasMatchingProduct) return true;
      }
    }

    if (rule.trigger_type === 'coupon' && appliedCouponCode && rule.coupon_code) {
      if (appliedCouponCode.toUpperCase() === rule.coupon_code.toUpperCase()) {
        if (rule.applies_to === 'all') return true;
        if (rule.applies_to === 'selected' && rule.product_ids?.length > 0) {
          const hasMatchingProduct = cartProductIds.some(pid => rule.product_ids.includes(pid));
          if (hasMatchingProduct) return true;
        }
      }
    }
  }

  return false;
}
