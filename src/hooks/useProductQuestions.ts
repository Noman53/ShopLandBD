import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductQuestion {
  id: string;
  product_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useProductQuestions(productId: string) {
  return useQuery({
    queryKey: ['product-questions', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_questions')
        .select('*, profiles:user_id(name, avatar_url)')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ProductQuestion[];
    },
    enabled: !!productId,
  });
}

export function useSubmitQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, question }: { productId: string; question: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('product_questions')
        .insert({
          product_id: productId,
          user_id: user.id,
          question: question.trim(),
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['product-questions', variables.productId] });
    },
  });
}

export function useAdminQuestions() {
  return useQuery({
    queryKey: ['admin-questions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_questions')
        .select(`
          *,
          profiles:user_id(name, avatar_url),
          products:product_id(name_bn, name_en)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as (ProductQuestion & { products: { name_bn: string; name_en: string } | null })[];
    },
  });
}

export function useAnswerQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const { error } = await supabase
        .from('product_questions')
        .update({ answer: answer.trim(), answered_at: new Date().toISOString() })
        .eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-questions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });
}

export function useToggleQuestionVisibility() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ questionId, isVisible }: { questionId: string; isVisible: boolean }) => {
      const { error } = await supabase
        .from('product_questions')
        .update({ is_visible: isVisible })
        .eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-questions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from('product_questions')
        .delete()
        .eq('id', questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-questions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });
}
