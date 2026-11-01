import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HeroSlide {
  id: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHeroSlides() {
  return useQuery({
    queryKey: ['hero-slides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('id, image_url, sort_order, is_active, created_at, updated_at')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useAllHeroSlides() {
  return useQuery({
    queryKey: ['hero-slides-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_slides')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as HeroSlide[];
    },
  });
}

export function useCreateHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: { image_url: string; sort_order: number; is_active: boolean }) => {
      const { data, error } = await supabase.from('hero_slides').insert(slide).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hero-slides'] });
      qc.invalidateQueries({ queryKey: ['hero-slides-admin'] });
    },
  });
}

export function useUpdateHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<HeroSlide> & { id: string }) => {
      const { data, error } = await supabase
        .from('hero_slides')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hero-slides'] });
      qc.invalidateQueries({ queryKey: ['hero-slides-admin'] });
    },
  });
}

export function useDeleteHeroSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('hero_slides').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hero-slides'] });
      qc.invalidateQueries({ queryKey: ['hero-slides-admin'] });
    },
  });
}
