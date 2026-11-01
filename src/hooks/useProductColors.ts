import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductColor {
  id: string;
  product_id: string;
  color_name: string;
  color_code: string | null;
  color_order: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColorFormData {
  color_name: string;
  color_code?: string | null;
  color_order: number;
  is_available: boolean;
}

// Common color presets with Bengali names
export const COLOR_PRESETS = [
  { name_en: 'Black', name_bn: 'কালো', code: '#000000' },
  { name_en: 'White', name_bn: 'সাদা', code: '#FFFFFF' },
  { name_en: 'Red', name_bn: 'লাল', code: '#EF4444' },
  { name_en: 'Blue', name_bn: 'নীল', code: '#3B82F6' },
  { name_en: 'Green', name_bn: 'সবুজ', code: '#22C55E' },
  { name_en: 'Yellow', name_bn: 'হলুদ', code: '#EAB308' },
  { name_en: 'Pink', name_bn: 'গোলাপি', code: '#EC4899' },
  { name_en: 'Purple', name_bn: 'বেগুনি', code: '#A855F7' },
  { name_en: 'Orange', name_bn: 'কমলা', code: '#F97316' },
  { name_en: 'Gray', name_bn: 'ধূসর', code: '#6B7280' },
  { name_en: 'Brown', name_bn: 'বাদামি', code: '#92400E' },
  { name_en: 'Navy', name_bn: 'নেভি', code: '#1E3A5F' },
];

export function useProductColors(productId: string) {
  return useQuery({
    queryKey: ['product-colors', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_colors')
        .select('*')
        .eq('product_id', productId)
        .order('color_order', { ascending: true });

      if (error) throw error;
      return data as ProductColor[];
    },
    enabled: !!productId,
  });
}

export function useCreateProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { product_id: string } & ColorFormData) => {
      const { data: result, error } = await supabase
        .from('product_colors')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.product_id] });
    },
  });
}

export function useUpdateProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; product_id: string } & Partial<ColorFormData>) => {
      const { id, product_id, ...updateData } = data;
      const { error } = await supabase
        .from('product_colors')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.product_id] });
    },
  });
}

export function useDeleteProductColor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: string; product_id: string }) => {
      const { error } = await supabase
        .from('product_colors')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.product_id] });
    },
  });
}

export function useBulkCreateProductColors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { product_id: string; colors: ColorFormData[] }) => {
      const colorsToInsert = data.colors.map(color => ({
        product_id: data.product_id,
        ...color,
      }));

      const { error } = await supabase
        .from('product_colors')
        .insert(colorsToInsert);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-colors', variables.product_id] });
    },
  });
}
