import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import SEO from '@/components/SEO';

export default function WishlistPage() {
  const { t, language } = useLanguage();
  const { items: wishlistItems, removeItem } = useWishlist();
  const { addItem } = useCart();
  const { toast } = useToast();
  const { data: products, isLoading } = useProducts({});

  const wishlistProducts = products?.filter(p => 
    wishlistItems.some(w => w.productId === p.id)
  ) || [];

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  const handleAddToCart = (product: any) => {
    if (product.stock_quantity < 1) return;

    addItem({
      productId: product.id,
      name_bn: product.name_bn,
      name_en: product.name_en,
      price: Number(product.price),
      discount_price: product.discount_price ? Number(product.discount_price) : null,
      quantity: 1,
      image: product.images?.[0] || '/placeholder.svg',
    });

    toast({
      title: t('কার্টে যোগ হয়েছে', 'Added to cart'),
      description: language === 'bn' ? product.name_bn : product.name_en,
    });
  };

  const handleRemove = (productId: string, productName: string) => {
    removeItem(productId);
    toast({
      title: t('উইশলিস্ট থেকে সরানো হয়েছে', 'Removed from wishlist'),
      description: productName,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background safe-bottom">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-6">{t('উইশলিস্ট', 'Wishlist')}</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO title={t('উইশলিস্ট', 'Wishlist')} description="আপনার পছন্দের পণ্যগুলো ShopLandBD উইশলিস্টে সংরক্ষণ করুন এবং পরে কিনুন।" canonical="/wishlist" noindex />
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-destructive" />
          <h1 className="text-2xl font-bold">
            {t('উইশলিস্ট', 'Wishlist')} ({wishlistProducts.length})
          </h1>
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg text-muted-foreground mb-6">
              {t('আপনার উইশলিস্ট খালি', 'Your wishlist is empty')}
            </p>
            <Link to="/products">
              <Button>
                {t('পণ্য দেখুন', 'Browse Products')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {wishlistProducts.map((product) => {
              const finalPrice = product.discount_price 
                ? Number(product.discount_price) 
                : Number(product.price);
              const productName = language === 'bn' ? product.name_bn : product.name_en;
              
              return (
                <div
                  key={product.id}
                  className="flex gap-4 p-4 bg-card border rounded-xl"
                >
                  <Link to={`/products/${product.id}`} className="flex-shrink-0">
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={productName}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${product.id}`}>
                      <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                        {productName}
                      </h3>
                    </Link>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-lg font-bold text-primary">
                        {priceDisplay(finalPrice)}
                      </span>
                      {product.discount_price && (
                        <span className="text-sm text-muted-foreground line-through">
                          {priceDisplay(Number(product.price))}
                        </span>
                      )}
                    </div>

                    {product.stock_quantity < 1 && (
                      <span className="text-sm text-destructive mt-1 block">
                        {t('স্টক শেষ', 'Out of Stock')}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock_quantity < 1}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">{t('কার্টে', 'Add')}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemove(product.id, productName)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
