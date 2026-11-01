import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Smartphone, 
  Shirt, 
  Home, 
  Heart, 
  ShoppingBasket,
  LucideIcon
} from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name_bn: string;
  name_en: string;
  slug: string;
  image_url: string | null;
  productCount?: number;
}

// Fallback icons based on category slug
const categoryIcons: Record<string, LucideIcon> = {
  'electronics': Smartphone,
  'fashion': Shirt,
  'home-living': Home,
  'beauty-health': Heart,
  'grocery': ShoppingBasket,
};

export default function CategoryCard({
  id,
  name_bn,
  name_en,
  slug,
  image_url,
  productCount,
}: CategoryCardProps) {
  const { language, t } = useLanguage();
  const FallbackIcon = categoryIcons[slug] || ShoppingBasket;

  return (
    <Link to={`/products?category=${slug}`} className="block group">
      <div className="category-card p-3 md:p-4 text-center transition-all duration-200 hover:shadow-md hover:border-primary/30">
        <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-2 md:mb-3 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden group-hover:bg-primary/20 transition-colors">
          {image_url ? (
            <img
              src={image_url}
              alt={language === 'bn' ? name_bn : name_en}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <FallbackIcon className="w-6 h-6 md:w-7 md:h-7 text-primary" />
          )}
        </div>
        <h3 className="font-medium text-xs md:text-sm mb-0.5 md:mb-1 line-clamp-2 group-hover:text-primary transition-colors">
          {language === 'bn' ? name_bn : name_en}
        </h3>
        {productCount !== undefined && (
          <p className="text-[10px] md:text-xs text-muted-foreground">
            {productCount} {t('পণ্য', 'products')}
          </p>
        )}
      </div>
    </Link>
  );
}
