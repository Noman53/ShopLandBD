import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProducts } from '@/hooks/useProducts';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ProductCard from './ProductCard';

interface RelatedProductsProps {
  productId: string;
  categorySlug?: string;
}

export default function RelatedProducts({ productId, categorySlug }: RelatedProductsProps) {
  const { t } = useLanguage();
  const { data: relatedProducts } = useProducts({
    category: categorySlug,
    limit: 8,
  });

  const { stockByProductId } = useComputedProductStock(relatedProducts);

  const filtered = relatedProducts?.filter(p => p.id !== productId).slice(0, 4);

  if (!filtered || filtered.length === 0) return null;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-xl font-bold mb-6">
        {t('আপনার পছন্দ হতে পারে', 'You May Also Like')}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filtered.map((product) => (
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
    </section>
  );
}
