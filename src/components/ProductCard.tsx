import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Plus, Heart, Info } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ProductCardProps {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  discount_price: number | null;
  images: string[];
  stock_quantity: number;
  is_wearable?: boolean | null;
  has_color_variants?: boolean | null;
}

export default function ProductCard({
  id,
  name_bn,
  name_en,
  price,
  discount_price,
  images,
  stock_quantity,
  is_wearable = false,
  has_color_variants = false,
}: ProductCardProps) {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { toast } = useToast();

  const isWishlisted = isInWishlist(id);
  const discountPercentage = discount_price
    ? Math.round(((price - discount_price) / price) * 100)
    : 0;

  // Check if product has variants requiring selection
  const hasVariants = Boolean(is_wearable) || Boolean(has_color_variants);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (stock_quantity < 1 || hasVariants) return;

    addItem({
      productId: id,
      name_bn,
      name_en,
      price,
      discount_price,
      quantity: 1,
      image: images[0] || '/product-placeholder.svg',
    });

    toast({
      title: t('কার্টে যোগ হয়েছে', 'Added to cart'),
      description: language === 'bn' ? name_bn : name_en,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggleItem(id);
    
    toast({
      title: isWishlisted
        ? t('উইশলিস্ট থেকে সরানো হয়েছে', 'Removed from wishlist')
        : t('উইশলিস্টে যোগ করা হয়েছে', 'Added to wishlist'),
      description: language === 'bn' ? name_bn : name_en,
    });
  };

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  return (
    <Link to={`/products/${id}`} className="product-card-link block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4">
      <div className="product-card group">
        {/* Image */}
        <div className="product-card-image relative aspect-square overflow-hidden">
          <img
            src={images[0] || '/product-placeholder.svg'}
            alt={language === 'bn' ? name_bn : name_en}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(event) => {
              if (!event.currentTarget.currentSrc.endsWith('/product-placeholder.svg')) {
                event.currentTarget.src = '/product-placeholder.svg';
              }
            }}
          />
          
          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <div className="discount-badge">
              -{discountPercentage}%
            </div>
          )}

          {/* Wishlist Button */}
          <button
            onClick={handleToggleWishlist}
            aria-label={isWishlisted ? t('উইশলিস্ট থেকে সরান', 'Remove from wishlist') : t('উইশলিস্টে যোগ করুন', 'Add to wishlist')}
            className="absolute top-3 right-3 w-10 h-10 rounded-full border border-white/70 bg-card/85 backdrop-blur-md flex items-center justify-center shadow-md hover:bg-card hover:scale-105 transition-all"
          >
            <Heart 
              className={cn(
                "w-4 h-4 transition-all",
                isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground"
              )} 
            />
          </button>

          {/* Out of Stock Overlay */}
          {stock_quantity < 1 && (
            <div className="absolute inset-0 bg-foreground/60 flex items-center justify-center">
              <span className="text-background font-bold text-sm px-4 py-2 bg-foreground/85 backdrop-blur-sm rounded-full">
                {t('স্টক শেষ', 'Out of Stock')}
              </span>
            </div>
          )}

          {/* Quick Add Button */}
          {stock_quantity > 0 && (
            hasVariants ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="cursor-default shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200"
                        disabled
                      >
                        <Info className="w-4 h-4" />
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-foreground text-background">
                    <p>{t('অর্ডার করতে অপশন বাছুন', 'Please choose your options to order')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Button
                onClick={handleAddToCart}
                size="icon"
                className="absolute bottom-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 translate-y-0 md:translate-y-2 md:group-hover:translate-y-0 transition-all duration-200 bg-primary hover:bg-primary/90 shadow-lg"
              >
                <Plus className="w-4 h-4" />
              </Button>
            )
          )}
        </div>

        {/* Content */}
        <div className="product-card-content p-3.5 sm:p-4">
          <h3 className="font-semibold text-[13px] sm:text-sm leading-snug line-clamp-2 mb-3 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {language === 'bn' ? name_bn : name_en}
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {discount_price ? (
                <>
                  <span className="price-current">
                    {priceDisplay(discount_price)}
                  </span>
                  <span className="price-original">
                    {priceDisplay(price)}
                  </span>
                </>
              ) : (
                <span className="price-current">{priceDisplay(price)}</span>
              )}
            </div>

            {/* Mobile Add Button */}
            {stock_quantity > 0 && (
              hasVariants ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="md:hidden h-10 w-10 p-0 rounded-xl"
                        disabled
                      >
                        <Info className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-foreground text-background">
                      <p>{t('অর্ডার করতে অপশন বাছুন', 'Please choose your options to order')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  onClick={handleAddToCart}
                  size="sm"
                  variant="secondary"
                  aria-label={t('কার্টে যোগ করুন', 'Add to cart')}
                  className="md:hidden h-10 w-10 p-0 rounded-xl shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
