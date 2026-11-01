import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductSize {
  id: string;
  product_id: string;
  color_id: string | null;
  size_name: string;
  size_order: number;
  stock_quantity: number;
  price_adjustment: number;
  measurements: Record<string, string>;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface SizeFormData {
  size_name: string;
  size_order: number;
  stock_quantity: number;
  price_adjustment: number;
  measurements: Record<string, string>;
  is_available: boolean;
}

// Common size presets for different product types
export const SIZE_PRESETS = {
  clothing: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
  kids: ['2-3Y', '3-4Y', '4-5Y', '5-6Y', '6-7Y', '7-8Y', '8-9Y', '9-10Y'],
};

// Size chart measurements
export const SIZE_MEASUREMENTS = {
  clothing: {
    XS: { chest: '84-88 cm', waist: '70-74 cm', hips: '88-92 cm' },
    S: { chest: '88-92 cm', waist: '74-78 cm', hips: '92-96 cm' },
    M: { chest: '92-96 cm', waist: '78-82 cm', hips: '96-100 cm' },
    L: { chest: '96-100 cm', waist: '82-86 cm', hips: '100-104 cm' },
    XL: { chest: '100-104 cm', waist: '86-90 cm', hips: '104-108 cm' },
    XXL: { chest: '104-108 cm', waist: '90-94 cm', hips: '108-112 cm' },
    XXXL: { chest: '108-112 cm', waist: '94-98 cm', hips: '112-116 cm' },
  },
  shoes: {
    '36': { eu: '36', uk: '3.5', us: '5', cm: '22.5' },
    '37': { eu: '37', uk: '4', us: '5.5', cm: '23' },
    '38': { eu: '38', uk: '5', us: '6.5', cm: '24' },
    '39': { eu: '39', uk: '6', us: '7.5', cm: '24.5' },
    '40': { eu: '40', uk: '6.5', us: '8', cm: '25' },
    '41': { eu: '41', uk: '7.5', us: '9', cm: '26' },
    '42': { eu: '42', uk: '8', us: '9.5', cm: '26.5' },
    '43': { eu: '43', uk: '9', us: '10.5', cm: '27.5' },
    '44': { eu: '44', uk: '9.5', us: '11', cm: '28' },
    '45': { eu: '45', uk: '10.5', us: '12', cm: '29' },
    '46': { eu: '46', uk: '11', us: '12.5', cm: '29.5' },
  },
};

export function useProductSizes(productId: string) {
  return useQuery({
    queryKey: ['product-sizes', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('product_id', productId)
        .order('size_order', { ascending: true });

      if (error) throw error;
      return data as ProductSize[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { product_id: string } & SizeFormData) => {
      const { error } = await supabase
        .from('product_sizes')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', variables.product_id] });
    },
  });
}

export function useUpdateProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id, ...updates }: { id: string; product_id: string } & Partial<SizeFormData>) => {
      const { error } = await supabase
        .from('product_sizes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return product_id;
    },
    onSuccess: (product_id) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', product_id] });
    },
  });
}

export function useDeleteProductSize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_id }: { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_sizes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return product_id;
    },
    onSuccess: (product_id) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', product_id] });
    },
  });
}

export function useBulkCreateProductSizes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, sizes }: { product_id: string; sizes: SizeFormData[] }) => {
      const dataToInsert = sizes.map((size, index) => ({
        ...size,
        product_id,
        size_order: index,
      }));

      const { error } = await supabase
        .from('product_sizes')
        .insert(dataToInsert);

      if (error) throw error;
      return product_id;
    },
    onSuccess: (product_id) => {
      queryClient.invalidateQueries({ queryKey: ['product-sizes', product_id] });
    },
  });
}
