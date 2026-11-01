import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FlashSaleProduct {
  product_id: string;
  product?: {
    id: string;
    name_bn: string;
    name_en: string;
    price: number;
    images: string[] | null;
    is_active?: boolean;
    is_wearable?: boolean;
    has_color_variants?: boolean;
    stock_quantity?: number;
  };
}

export interface FlashSale {
  id: string;
  name_bn: string;
  name_en: string;
  discount_percentage: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: FlashSaleProduct[];
}

export function useFlashSales() {
  return useQuery({
    queryKey: ['flash-sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flash_sales')
        .select(`
          *,
          flash_sale_products (
            product_id,
            products (
              id,
              name_bn,
              name_en,
              price,
              images,
              is_active
            )
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to use 'products' key for easier access
      return data.map(sale => ({
        ...sale,
        products: sale.flash_sale_products?.map((fsp: any) => ({
          product_id: fsp.product_id,
          product: fsp.products
        }))
      })) as unknown as FlashSale[];
    },
  });
}

export function useActiveFlashSale() {
  return useQuery({
    queryKey: ['active-flash-sale'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('flash_sales')
        .select(`
          *,
          flash_sale_products (
            product_id,
            products (
              id,
              name_bn,
              name_en,
              price,
              discount_price,
              images,
              is_active,
              is_wearable,
              has_color_variants,
              stock_quantity
            )
          )
        `)
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;
      
      // Transform data to use 'products' key for easier access
      return {
        ...data,
        products: data.flash_sale_products?.map((fsp: any) => ({
          product_id: fsp.product_id,
          product: fsp.products
        }))
      } as unknown as FlashSale;
    },
  });
}

export function useCreateFlashSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (flashSale: {
      name_bn: string;
      name_en: string;
      discount_percentage: number;
      starts_at: string;
      ends_at: string;
      is_active?: boolean;
      product_ids: string[];
    }) => {
      const { product_ids, ...saleData } = flashSale;

      const { data: sale, error: saleError } = await supabase
        .from('flash_sales')
        .insert(saleData)
        .select()
        .single();

      if (saleError) throw saleError;

      if (product_ids.length > 0) {
        const { error: productsError } = await supabase
          .from('flash_sale_products')
          .insert(product_ids.map(pid => ({
            flash_sale_id: sale.id,
            product_id: pid,
          })));

        if (productsError) throw productsError;
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      queryClient.invalidateQueries({ queryKey: ['active-flash-sale'] });
    },
  });
}

export function useUpdateFlashSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, product_ids, ...updates }: {
      id: string;
      name_bn?: string;
      name_en?: string;
      discount_percentage?: number;
      starts_at?: string;
      ends_at?: string;
      is_active?: boolean;
      product_ids?: string[];
    }) => {
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('flash_sales')
          .update(updates)
          .eq('id', id);

        if (error) throw error;
      }

      if (product_ids) {
        // Remove existing products
        await supabase
          .from('flash_sale_products')
          .delete()
          .eq('flash_sale_id', id);

        // Add new products
        if (product_ids.length > 0) {
          const { error } = await supabase
            .from('flash_sale_products')
            .insert(product_ids.map(pid => ({
              flash_sale_id: id,
              product_id: pid,
            })));

          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      queryClient.invalidateQueries({ queryKey: ['active-flash-sale'] });
    },
  });
}

export function useDeleteFlashSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - set deleted_at timestamp
      const { error } = await supabase
        .from('flash_sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flash-sales'] });
      queryClient.invalidateQueries({ queryKey: ['active-flash-sale'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-flash-sales'] });
    },
  });
}
