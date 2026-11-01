import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Product {
  id: string;
  category_id: string | null;
  name_bn: string;
  name_en: string;
  description_bn: string | null;
  description_en: string | null;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  is_wearable: boolean;
  has_color_variants: boolean;
  size_chart_image: string | null;
  created_at: string;
  updated_at: string;
  categories?: {
    id: string;
    name_bn: string;
    name_en: string;
    slug: string;
  } | null;
}

export interface Category {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

interface UseProductsOptions {
  category?: string;
  featured?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'newest';
  limit?: number;
}

export function useProducts(options: UseProductsOptions = {}) {
  const queryClient = useQueryClient();

  // Real-time subscription for products table changes (stock updates, etc.)
  useEffect(() => {
    const channel = supabase
      .channel('products-realtime-list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_sizes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['variant-stock'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['products', options],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name_bn,
            name_en,
            slug
          )
        `)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (options.category) {
        query = query.eq('categories.slug', options.category);
      }

      if (options.featured) {
        query = query.eq('is_featured', true);
      }

      if (options.search) {
        query = query.or(`name_bn.ilike.%${options.search}%,name_en.ilike.%${options.search}%`);
      }

      if (options.minPrice !== undefined) {
        query = query.gte('price', options.minPrice);
      }

      if (options.maxPrice !== undefined) {
        query = query.lte('price', options.maxPrice);
      }

      if (options.sortBy === 'price-asc') {
        query = query.order('price', { ascending: true });
      } else if (options.sortBy === 'price-desc') {
        query = query.order('price', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filter by category after the query since the relationship filter doesn't work as expected
      let products = data as Product[];
      if (options.category) {
        products = products.filter(p => p.categories?.slug === options.category);
      }
      
      return products;
    },
  });
}

export function useProduct(id: string) {
  const queryClient = useQueryClient();

  // Real-time subscription for this specific product
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`product-realtime-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['product', id] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_sizes' },
        (payload) => {
          const productId = (payload.new as any)?.product_id || (payload.old as any)?.product_id;
          if (productId === id) {
            queryClient.invalidateQueries({ queryKey: ['variant-stock'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  return useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name_bn,
            name_en,
            slug
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });
}
