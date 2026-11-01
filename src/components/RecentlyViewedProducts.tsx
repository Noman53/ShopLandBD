import React from 'react';
import { Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ProductCard from './ProductCard';

interface RecentlyViewedProductsProps {
  excludeId?: string;
}

export default function RecentlyViewedProducts({ excludeId }: RecentlyViewedProductsProps) {
  const { t } = useLanguage();
  const { viewedIds } = useRecentlyViewed();

  const filteredIds = excludeId ? viewedIds.filter(id => id !== excludeId) : viewedIds;

  const { data: products } = useQuery({
    queryKey: ['recently-viewed', filteredIds],
    queryFn: async () => {
      if (filteredIds.length === 0) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name_bn, name_en, price, discount_price, images, stock_quantity, is_wearable, has_color_variants')
        .in('id', filteredIds)
        .eq('is_active', true)
        .is('deleted_at', null);
      if (error) throw error;
      // Sort by viewed order
      return filteredIds
        .map(id => data.find(p => p.id === id))
        .filter(Boolean) as typeof data;
    },
    enabled: filteredIds.length > 0,
  });

  const { stockByProductId } = useComputedProductStock(products);

  if (!products || products.length === 0) return null;

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2 className="text-xl md:text-2xl font-bold mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          {t('সম্প্রতি দেখেছেন', 'Recently Viewed')}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.slice(0, 4).map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name_bn={product.name_bn}
              name_en={product.name_en}
              price={Number(product.price)}
              discount_price={product.discount_price ? Number(product.discount_price) : null}
              images={product.images || []}
              stock_quantity={stockByProductId.get(product.id) ?? product.stock_quantity}
              is_wearable={product.is_wearable}
              has_color_variants={product.has_color_variants}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
