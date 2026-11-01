import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useProductReviews(productId: string) {
  return useQuery({
    queryKey: ['product-reviews', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles for review authors
      const reviews = data || [];
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      
      let profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);
        
        profiles?.forEach(p => {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        });
      }

      return reviews.map(r => ({
        ...r,
        profiles: profileMap[r.user_id] || null,
      })) as ProductReview[];
    },
    enabled: !!productId,
  });
}

export function useUserReview(productId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['user-review', productId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ProductReview | null;
    },
    enabled: !!productId && !!user,
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ productId, rating, comment }: { productId: string; rating: number; comment: string }) => {
      if (!user) throw new Error('Must be logged in');
      
      // Check if auto-approve is enabled
      const { data: settingData } = await supabase
        .from('store_settings')
        .select('value')
        .eq('key', 'review_auto_approve')
        .maybeSingle();
      
      const autoApprove = settingData?.value !== 'false'; // default true
      
      const { data, error } = await supabase
        .from('product_reviews')
        .upsert({
          product_id: productId,
          user_id: user.id,
          rating,
          comment: comment || null,
          is_approved: autoApprove,
        }, {
          onConflict: 'user_id,product_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['product-rating-stats', variables.productId] });
    },
  });
}

export function useProductRatingStats(productId: string) {
  return useQuery({
    queryKey: ['product-rating-stats', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('rating')
        .eq('product_id', productId)
        .eq('is_approved', true);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
      }

      const total = data.reduce((sum, r) => sum + r.rating, 0);
      const average = total / data.length;
      const distribution = [0, 0, 0, 0, 0];
      data.forEach(r => {
        distribution[r.rating - 1]++;
      });

      return { average, count: data.length, distribution };
    },
    enabled: !!productId,
  });
}

// Admin hooks
export function useAllReviews() {
  return useQuery({
    queryKey: ['admin-reviews'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const reviews = data || [];
      
      // Fetch profiles and products separately
      const userIds = [...new Set(reviews.map(r => r.user_id))];
      const productIds = [...new Set(reviews.map(r => r.product_id))];
      
      let profileMap: Record<string, { name: string | null; avatar_url: string | null }> = {};
      let productMap: Record<string, { name_bn: string; name_en: string }> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', userIds);
        profiles?.forEach(p => {
          profileMap[p.user_id] = { name: p.name, avatar_url: p.avatar_url };
        });
      }
      
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name_bn, name_en')
          .in('id', productIds);
        products?.forEach(p => {
          productMap[p.id] = { name_bn: p.name_bn, name_en: p.name_en };
        });
      }

      return reviews.map(r => ({
        ...r,
        profiles: profileMap[r.user_id] || null,
        products: productMap[r.product_id] || null,
      }));
    },
  });
}

export function useApproveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, approved }: { reviewId: string; approved: boolean }) => {
      const { error } = await supabase
        .from('product_reviews')
        .update({ is_approved: approved })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-rating-stats'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product-rating-stats'] });
    },
  });
}
