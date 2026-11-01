import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories } from '@/hooks/useProducts';
import CategoryCard from '@/components/CategoryCard';
import SEO, { SITE_URL } from '@/components/SEO';

export default function CategoriesPage() {
  const { t } = useLanguage();
  const { data: categories, isLoading } = useCategories();

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('সব ক্যাটাগরি', 'All Categories')}
        description="ShopLandBD-এর সব ক্যাটাগরি দেখুন। পছন্দের ক্যাটাগরি থেকে পণ্য বাছাই করুন।"
        canonical="/categories"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'All Categories — ShopLandBD',
          url: `${SITE_URL}/categories`,
        }}
      />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          {t('সব ক্যাটাগরি', 'All Categories')}
        </h1>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories?.map((category) => (
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
    </div>
  );
}
