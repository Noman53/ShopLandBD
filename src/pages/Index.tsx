import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import HeroSection from '@/components/HeroSection';
import FlashSaleSection from '@/components/FlashSaleSection';
import { Button } from '@/components/ui/button';
import RecentlyViewedProducts from '@/components/RecentlyViewedProducts';
import { ArrowRight, Loader2 } from 'lucide-react';
import SEO, { buildOrganizationSchema, buildWebsiteSchema } from '@/components/SEO';

export default function Index() {
  const { t } = useLanguage();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: productsLoading } = useProducts({
    featured: true,
    limit: 8,
  });
  const { data: newProducts } = useProducts({
    sortBy: 'newest',
    limit: 4,
  });

  const combined = React.useMemo(
    () => [...(featuredProducts ?? []), ...(newProducts ?? [])],
    [featuredProducts, newProducts]
  );
  const { stockByProductId } = useComputedProductStock(combined);
  const getStock = (id: string, fallback: number) => stockByProductId.get(id) ?? fallback;

  return (
    <div className="page-enter storefront-page min-h-screen bg-background safe-bottom">
      <SEO
        canonical="/"
        jsonLd={[buildOrganizationSchema(), buildWebsiteSchema()]}
      />
      {/* Hero Section */}
      <HeroSection />

      {/* Flash Sale Section */}
      <FlashSaleSection />

      {/* Categories Section */}
      <section className="store-section scroll-reveal py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="store-section-heading font-bold">
              {t('ক্যাটাগরি সমূহ', 'Categories')}
            </h2>
            <Link to="/categories">
              <Button variant="ghost" size="sm">
                {t('সব দেখুন', 'View All')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {categoriesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 md:gap-4">
              {categories?.slice(0, 5).map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name_bn={category.name_bn}
                  name_en={category.name_en}
                  slug={category.slug}
                  image_url={category.image_url}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="store-section scroll-reveal bg-secondary/35 py-10 md:py-14">
        <div className="container mx-auto rounded-[2rem] px-4 py-2 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="store-section-heading font-bold">
              {t('জনপ্রিয় পণ্য', 'Featured Products')}
            </h2>
            <Link to="/products">
              <Button variant="ghost" size="sm">
                {t('সব দেখুন', 'View All')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton aspect-[3/4] rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts?.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name_bn={product.name_bn}
                  name_en={product.name_en}
                  price={Number(product.price)}
                  discount_price={product.discount_price ? Number(product.discount_price) : null}
                  images={product.images || []}
                  stock_quantity={getStock(product.id, product.stock_quantity)}
                  is_wearable={product.is_wearable}
                  has_color_variants={product.has_color_variants}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* New Arrivals */}
      <section className="store-section scroll-reveal py-10 md:py-14">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="store-section-heading font-bold">
              {t('নতুন পণ্য', 'New Arrivals')}
            </h2>
            <Link to="/products?sort=newest">
              <Button variant="ghost" size="sm">
                {t('সব দেখুন', 'View All')}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newProducts?.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name_bn={product.name_bn}
                name_en={product.name_en}
                price={Number(product.price)}
                discount_price={product.discount_price ? Number(product.discount_price) : null}
                images={product.images || []}
                stock_quantity={getStock(product.id, product.stock_quantity)}
                is_wearable={product.is_wearable}
                has_color_variants={product.has_color_variants}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <RecentlyViewedProducts />

      {/* Trust Banner */}
      <section className="scroll-reveal bg-gradient-to-br from-primary via-primary to-emerald-950 py-10 text-primary-foreground md:py-14">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('আজই অর্ডার করুন!', 'Order Today!')}
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            {t(
              'ক্যাশ অন ডেলিভারি এবং বিকাশ পেমেন্ট সুবিধা। সারাদেশে দ্রুত ডেলিভারি।',
              'Cash on Delivery and bKash payment available. Fast delivery nationwide.'
            )}
          </p>
          <Link to="/products">
            <Button size="lg" variant="secondary" className="font-semibold">
              {t('শপিং করুন', 'Shop Now')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
