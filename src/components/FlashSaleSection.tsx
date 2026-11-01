import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useActiveFlashSale, FlashSale } from '@/hooks/useFlashSales';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function FlashSaleSection() {
  const { t, language } = useLanguage();
  const { data: flashSale, isLoading } = useActiveFlashSale();

  // Extract products for stock computation - must be before any conditional returns
  const products = React.useMemo(() => {
    if (!flashSale?.products) return [];
    return flashSale.products
      .map(fsp => fsp.product)
      .filter(Boolean)
      .filter(p => p?.is_active);
  }, [flashSale]);

  // Call hook unconditionally before any returns
  const { stockByProductId } = useComputedProductStock(products as any);

  if (isLoading) {
    return (
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!flashSale || products.length === 0) {
    return null;
  }

  // Calculate time remaining
  const endTime = new Date(flashSale.ends_at).getTime();
  const now = Date.now();
  const timeLeft = endTime - now;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  const getFallbackStock = (p: unknown) => {
    return Number((p as any)?.stock_quantity) || 0;
  };

  return (
    <section className="py-8 md:py-12 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg animate-pulse">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
                {language === 'bn' ? flashSale.name_bn : flashSale.name_en}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>
                  {t('বাকি সময়:', 'Ends in:')} {hoursLeft}h {minutesLeft}m
                </span>
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                  {flashSale.discount_percentage}% {t('ছাড়', 'OFF')}
                </span>
              </div>
            </div>
          </div>
          <Link to={`/products?flash_sale=${flashSale.id}`}>
            <Button variant="outline" size="sm" className="border-red-500 text-red-500 hover:bg-red-50">
              {t('সব দেখুন', 'View All')}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.slice(0, 4).map((product) => {
            if (!product) return null;
            const discountedPrice = product.price * (1 - flashSale.discount_percentage / 100);
            return (
              <ProductCard
                key={product.id}
                id={product.id}
                name_bn={product.name_bn}
                name_en={product.name_en}
                price={Number(product.price)}
                discount_price={Number(discountedPrice)}
                images={product.images || []}
                stock_quantity={stockByProductId.get(product.id) ?? getFallbackStock(product)}
                is_wearable={product.is_wearable}
                has_color_variants={product.has_color_variants}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
