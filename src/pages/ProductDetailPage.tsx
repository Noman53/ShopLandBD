import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Minus, Plus, ShoppingCart, Truck, Shield, Loader2, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useProduct } from '@/hooks/useProducts';
import { useProductSizes, ProductSize } from '@/hooks/useProductSizes';
import { useProductColors, ProductColor } from '@/hooks/useProductColors';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ImageGallery from '@/components/ImageGallery';
import WishlistButton from '@/components/WishlistButton';
import SizeSelector from '@/components/SizeSelector';
import ColorSelector from '@/components/ColorSelector';
import ProductReviews from '@/components/ProductReviews';
import ProductQA from '@/components/ProductQA';
import RelatedProducts from '@/components/RelatedProducts';
import { Button } from '@/components/ui/button';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useToast } from '@/hooks/use-toast';
import { formatPrice } from '@/lib/formatters';
import SEO, { buildProductSchema, buildBreadcrumbSchema } from '@/components/SEO';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [showGoBack, setShowGoBack] = useState(true);
  const lastScrollY = React.useRef(0);
  const { data: product, isLoading } = useProduct(id || '');
  const { data: sizes } = useProductSizes(id || '');
  const { data: colors } = useProductColors(id || '');
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  // Track recently viewed
  useEffect(() => {
    if (id) addToRecentlyViewed(id);
  }, [id, addToRecentlyViewed]);

  // Check if product has variants
  const isWearable = product?.is_wearable && sizes && sizes.length > 0;
  const hasColors = product?.has_color_variants && colors && colors.length > 0;
  
  // Calculate available sizes and colors
  const availableSizes = useMemo(() => {
    return sizes?.filter(s => s.is_available && s.stock_quantity > 0) || [];
  }, [sizes]);

  const totalVariantStock = useMemo(() => {
    const rows = sizes ?? [];
    return rows.reduce((sum, r) => sum + (r.is_available ? Math.max(0, Number(r.stock_quantity) || 0) : 0), 0);
  }, [sizes]);

  const colorStockById = useMemo(() => {
    const map = new Map<string, number>();
    const rows = sizes ?? [];
    for (const r of rows) {
      if (!r.is_available || !r.color_id) continue;
      map.set(r.color_id, (map.get(r.color_id) ?? 0) + Math.max(0, Number(r.stock_quantity) || 0));
    }
    return map;
  }, [sizes]);

  const disabledColorIds = useMemo(() => {
    // Only disable colors by stock when we actually have color-based stock rows
    const hasAnyColorStockRows = (sizes ?? []).some(r => !!r.color_id);
    if (!hasAnyColorStockRows) return [] as string[];
    return (colors ?? [])
      .filter(c => (colorStockById.get(c.id) ?? 0) <= 0)
      .map(c => c.id);
  }, [colors, colorStockById, sizes]);

  const availableColors = useMemo(() => {
    return colors?.filter(c => c.is_available && !disabledColorIds.includes(c.id)) || [];
  }, [colors, disabledColorIds]);

  // Check if product has any stock at all (through variants or main stock)
  const hasAnyStock = useMemo(() => {
    const hasVariants = isWearable || hasColors;
    if (hasVariants) return totalVariantStock > 0;
    return (product?.stock_quantity || 0) > 0;
  }, [isWearable, hasColors, totalVariantStock, product?.stock_quantity]);

  // Calculate effective stock based on selected variant
  const effectiveStock = useMemo(() => {
    if ((isWearable || hasColors) && selectedSize) {
      return Math.max(0, Number(selectedSize.stock_quantity) || 0);
    }
    // If we have explicit color-based variant stock rows, show per-color stock.
    const hasAnyColorStockRows = (sizes ?? []).some(r => !!r.color_id);
    if (hasColors && selectedColor && hasAnyColorStockRows) {
      return Math.max(0, colorStockById.get(selectedColor.id) ?? 0);
    }
    if (isWearable || hasColors) return totalVariantStock;
    return product?.stock_quantity || 0;
  }, [isWearable, hasColors, selectedSize, selectedColor, product?.stock_quantity, totalVariantStock, sizes, colorStockById]);

  useEffect(() => {
    if (selectedColor && disabledColorIds.includes(selectedColor.id)) {
      setSelectedColor(null);
    }
  }, [disabledColorIds, selectedColor]);

  // Scroll-direction tracking for go-back bar
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 80) {
        setShowGoBack(true);
      } else if (y < lastScrollY.current) {
        setShowGoBack(true);
      } else {
        setShowGoBack(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  // Calculate effective price including variant adjustments
  const getEffectivePrice = () => {
    if (!product) return 0;
    const basePrice = product.discount_price ? Number(product.discount_price) : Number(product.price);
    const adjustment = selectedSize ? Number(selectedSize.price_adjustment) || 0 : 0;
    return basePrice + adjustment;
  };

  // Determine if add to cart is allowed
  const canAddToCart = useMemo(() => {
    if (isWearable && !selectedSize) return false;
    if (hasColors && !selectedColor) return false;
    return effectiveStock > 0;
  }, [isWearable, hasColors, selectedSize, selectedColor, effectiveStock]);

  // Validation message
  const getValidationMessage = () => {
    if (isWearable && !selectedSize) {
      return t('সাইজ নির্বাচন করুন', 'Select a Size');
    }
    if (hasColors && !selectedColor) {
      return t('রঙ নির্বাচন করুন', 'Select a Color');
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <p className="text-lg text-muted-foreground mb-4">
          {t('পণ্য পাওয়া যায়নি', 'Product not found')}
        </p>
        <Button onClick={() => navigate('/products')}>
          {t('সব পণ্য দেখুন', 'View All Products')}
        </Button>
      </div>
    );
  }

  const images = product.images?.length ? product.images : ['/product-placeholder.svg'];
  const discountPercentage = product.discount_price
    ? Math.round(((Number(product.price) - Number(product.discount_price)) / Number(product.price)) * 100)
    : 0;

  const handleAddToCart = () => {
    const validationMsg = getValidationMessage();
    if (validationMsg) {
      toast({
        title: validationMsg,
        description: t('কার্টে যোগ করার আগে বেছে নিন', 'Please choose before adding to cart'),
        variant: 'destructive',
      });
      return;
    }
    
    if (effectiveStock <= 0) return;

    const variantInfo = [
      selectedSize?.size_name,
      selectedColor?.color_name
    ].filter(Boolean).join(', ');

    addItem({
      productId: product.id,
      name_bn: product.name_bn + (variantInfo ? ` (${variantInfo})` : ''),
      name_en: product.name_en + (variantInfo ? ` (${variantInfo})` : ''),
      price: Number(product.price) + (selectedSize ? Number(selectedSize.price_adjustment) || 0 : 0),
      discount_price: product.discount_price 
        ? Number(product.discount_price) + (selectedSize ? Number(selectedSize.price_adjustment) || 0 : 0)
        : null,
      quantity,
      image: images[0],
    });

    toast({
      title: t('কার্টে যোগ হয়েছে', 'Added to cart'),
      description: `${quantity}x ${language === 'bn' ? product.name_bn : product.name_en}${variantInfo ? ` (${variantInfo})` : ''}`,
    });
  };

  const handleBuyNow = () => {
    const validationMsg = getValidationMessage();
    if (validationMsg) {
      toast({
        title: validationMsg,
        description: t('কেনার আগে বেছে নিন', 'Please choose before buying'),
        variant: 'destructive',
      });
      return;
    }
    handleAddToCart();
    navigate('/checkout');
  };

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  const productName = language === 'bn' ? product.name_bn : product.name_en;
  const categorySlug = product.categories?.slug;


  return (
    <div className="page-enter min-h-screen bg-background pb-32 md:pb-8">
      <SEO
        title={productName}
        description={`${productName} — ${formatPrice(product.discount_price ? Number(product.discount_price) : Number(product.price), language)}। ShopLandBD-তে অর্ডার করুন।`}
        canonical={`/products/${product.id}`}
        ogImage={images[0] !== '/product-placeholder.svg' ? images[0] : undefined}
        ogType="product"
        jsonLd={[
          buildProductSchema({
            name: product.name_en,
            description: product.description_en || product.name_en,
            price: Number(product.price),
            discountPrice: product.discount_price ? Number(product.discount_price) : null,
            image: images[0],
            inStock: hasAnyStock,
            url: `/products/${product.id}`,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Products', url: '/products' },
            { name: product.name_en, url: `/products/${product.id}` },
          ]),
        ]}
      />
      {/* Back Button - show on scroll up, hide on scroll down */}
      <div
        className={cn(
          "bg-card border-b border-border py-3 sticky top-[64px] z-40 shadow-sm transition-all duration-300",
          showGoBack ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
        )}
      >
        <div className="container mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('পেছনে যান', 'Go Back')}</span>
          </button>
          <WishlistButton 
            productId={product.id} 
            productName={productName}
          />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="product-detail-layout grid items-start gap-6 md:grid-cols-2 md:gap-8">
          {/* Image Gallery with Zoom */}
          <div className="scroll-reveal">
          <ImageGallery 
            images={images} 
            alt={productName}
            discountPercentage={discountPercentage}
          />
          </div>

          {/* Product Info */}
          <div className="product-detail-panel scroll-reveal">
            {/* Category */}
            {product.categories && (
              <Link
                to={`/products?category=${product.categories.slug}`}
                className="text-sm text-primary hover:underline mb-2 inline-block"
              >
                {language === 'bn' ? product.categories.name_bn : product.categories.name_en}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold mb-4">
              {productName}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              {product.discount_price ? (
                <>
                  <span className="text-3xl font-bold text-primary">
                    {priceDisplay(getEffectivePrice())}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    {priceDisplay(Number(product.price) + (selectedSize ? Number(selectedSize.price_adjustment) || 0 : 0))}
                  </span>
                  <span className="bg-accent text-accent-foreground text-sm font-bold px-2 py-1 rounded">
                    -{discountPercentage}%
                  </span>
                </>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {priceDisplay(getEffectivePrice())}
                </span>
              )}
            </div>

            {/* Color Selector */}
            {hasColors && colors && (
              <div className="mb-6">
                <ColorSelector
                  colors={colors}
                  selectedColor={selectedColor?.id || null}
                  onSelectColor={(color) => setSelectedColor(color)}
                  disabledColorIds={disabledColorIds}
                />
              </div>
            )}

            {/* Size Selector for Wearables */}
            {isWearable && sizes && (
              <div className="mb-6">
                <SizeSelector
                  sizes={sizes}
                  selectedSize={selectedSize?.id || null}
                  onSelectSize={(size) => setSelectedSize(size)}
                  productType="clothing"
                  sizeChartImage={product.size_chart_image}
                />
              </div>
            )}

            {/* Stock Status */}
            {!hasAnyStock ? (
              <div className="mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg font-medium">
                  ✕ {t('স্টক শেষ', 'Out of Stock')}
                </div>
              </div>
            ) : (!isWearable && !hasColors) || (selectedSize || selectedColor) ? (
              <div className="mb-6">
                {effectiveStock > 0 ? (
                  <span className="text-success font-medium">
                    ✓ {t('স্টকে আছে', 'In Stock')} ({effectiveStock} {t('টি', 'available')})
                  </span>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-destructive/10 text-destructive rounded-lg font-medium">
                    ✕ {t('স্টক শেষ', 'Out of Stock')}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <div className="space-y-1">
                  <span className="text-success font-medium">
                    ✓ {t('স্টকে আছে', 'In Stock')}
                  </span>
                  <span className="block text-muted-foreground text-sm">
                    {isWearable && !selectedSize && t('কেনার জন্য সাইজ নির্বাচন করুন', 'Select a size to buy')}
                    {hasColors && !selectedColor && !isWearable && t('কেনার জন্য রঙ নির্বাচন করুন', 'Select a color to buy')}
                    {hasColors && !selectedColor && isWearable && t('কেনার জন্য রঙ নির্বাচন করুন', 'Select a color to buy')}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            {hasAnyStock && canAddToCart && effectiveStock > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-sm font-medium">{t('পরিমাণ', 'Quantity')}:</span>
                <div className="flex items-center border border-border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-secondary transition-colors"
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(effectiveStock, quantity + 1))}
                    className="p-2 hover:bg-secondary transition-colors"
                    disabled={quantity >= effectiveStock}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex gap-3 mb-8">
              <Button
                onClick={handleAddToCart}
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={!hasAnyStock}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {getValidationMessage() || t('কার্টে যোগ করুন', 'Add to Cart')}
              </Button>
              <Button
                onClick={handleBuyNow}
                size="lg"
                className="flex-1"
                disabled={!hasAnyStock}
              >
                {t('এখনই কিনুন', 'Buy Now')}
              </Button>
            </div>

            {/* Features */}
            <div className="space-y-3 border-t border-border pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('দ্রুত ডেলিভারি', 'Fast Delivery')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('সারাদেশে ২-৫ দিনে', '2-5 days nationwide')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('আনুমানিক ডেলিভারি', 'Estimated Delivery')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('ঢাকায় ১-২ দিন, ঢাকার বাইরে ৩-৫ দিন', 'Dhaka: 1-2 days, Outside: 3-5 days')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{t('নিরাপদ পেমেন্ট', 'Secure Payment')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('ক্যাশ অন ডেলিভারি ও বিকাশ', 'COD & bKash available')}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {(product.description_bn || product.description_en) && (
              <div className="border-t border-border pt-6 mt-6">
                <h3 className="font-bold text-lg mb-3">{t('বিবরণ', 'Description')}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {language === 'bn' ? product.description_bn : product.description_en}
                </p>
              </div>
            )}

            {/* Product Reviews */}
            <ProductReviews productId={product.id} />

            {/* Product Q&A */}
            <ProductQA productId={product.id} />
          </div>
        </div>

        {/* Related Products */}
        <RelatedProducts productId={product.id} categorySlug={categorySlug} />
      </div>

      {/* Sticky Mobile Add to Cart */}
      {hasAnyStock && (
        <div className="fixed bottom-[80px] left-0 right-0 md:hidden bg-card border-t border-border p-4 z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex gap-3">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              className="flex-1"
              disabled={!hasAnyStock}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {getValidationMessage() || t('কার্টে', 'Add')}
            </Button>
            <Button
              onClick={handleBuyNow}
              className="flex-1"
              disabled={!hasAnyStock}
            >
              {t('এখনই কিনুন', 'Buy Now')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
