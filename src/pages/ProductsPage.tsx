import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProducts, useCategories } from '@/hooks/useProducts';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/lib/formatters';
import SEO, { SITE_URL } from '@/components/SEO';

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc'>(
    (searchParams.get('sort') as any) || 'newest'
  );
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: products, isLoading: productsLoading } = useProducts({
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
    sortBy,
  });

  const { stockByProductId } = useComputedProductStock(products);

  const getStock = (productId: string, fallback: number) => {
    return stockByProductId.get(productId) ?? fallback;
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product) => {
      const price = Number(product.discount_price || product.price);
      if (price < priceRange[0] || price > priceRange[1]) return false;
      const stock = getStock(product.id, product.stock_quantity);
      if (inStockOnly && stock < 1) return false;
      return true;
    });
  }, [products, priceRange, inStockOnly, stockByProductId]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (value) {
      searchParams.set('search', value);
    } else {
      searchParams.delete('search');
    }
    setSearchParams(searchParams);
    scrollToTop();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (category) {
      searchParams.set('category', category);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
    scrollToTop();
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as any);
    searchParams.set('sort', value);
    setSearchParams(searchParams);
    scrollToTop();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setPriceRange([0, 10000]);
    setInStockOnly(false);
    setSortBy('newest');
    setSearchParams({});
  };

  const activeFiltersCount = [
    selectedCategory,
    priceRange[0] > 0 || priceRange[1] < 10000,
    inStockOnly,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('সব পণ্য', 'All Products')}
        description="ShopLandBD-তে সব পণ্য ব্রাউজ করুন। সেরা দামে অনলাইন শপিং করুন বাংলাদেশে।"
        canonical="/products"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'All Products — ShopLandBD',
          url: `${SITE_URL}/products`,
        }}
      />
      {/* Search & Filter Bar - Always visible sticky */}
      <div className="bg-card border-b border-border py-4 sticky top-[64px] z-40 shadow-sm">
        <div className="container mx-auto px-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('পণ্য খুঁজুন...', 'Search products...')}
              className="search-bar"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Sort & Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <Button
                variant={selectedCategory === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleCategoryChange('')}
                className="flex-shrink-0"
              >
                {t('সব', 'All')}
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.slug ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange(cat.slug)}
                  className="flex-shrink-0"
                >
                  {language === 'bn' ? cat.name_bn : cat.name_en}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Sort Dropdown */}
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[120px] md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">{t('নতুন', 'Newest')}</SelectItem>
                  <SelectItem value="price-asc">{t('দাম: কম → বেশি', 'Price: Low → High')}</SelectItem>
                  <SelectItem value="price-desc">{t('দাম: বেশি → কম', 'Price: High → Low')}</SelectItem>
                </SelectContent>
              </Select>

              {/* Filter Button */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFiltersCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-80">
                  <SheetHeader>
                    <SheetTitle>{t('ফিল্টার', 'Filters')}</SheetTitle>
                  </SheetHeader>

                  <div className="py-6 space-y-6">
                    {/* Price Range */}
                    <div>
                      <h4 className="font-medium mb-4">{t('মূল্য সীমা', 'Price Range')}</h4>
                      <Slider
                        value={priceRange}
                        onValueChange={setPriceRange}
                        min={0}
                        max={10000}
                        step={100}
                        className="mb-2"
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{formatPrice(priceRange[0], language)}</span>
                        <span>{formatPrice(priceRange[1], language)}</span>
                      </div>
                    </div>

                    {/* In Stock Only */}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="inStock"
                        checked={inStockOnly}
                        onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                      />
                      <label
                        htmlFor="inStock"
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {t('শুধু স্টকে আছে', 'In Stock Only')}
                      </label>
                    </div>

                    {/* Clear Filters */}
                    <Button variant="outline" onClick={clearFilters} className="w-full">
                      {t('ফিল্টার মুছুন', 'Clear Filters')}
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-6">
        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {filteredProducts.length} {t('টি পণ্য পাওয়া গেছে', 'products found')}
        </p>

        {productsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              {t('কোন পণ্য পাওয়া যায়নি', 'No products found')}
            </p>
            <Button onClick={clearFilters}>
              {t('ফিল্টার মুছুন', 'Clear Filters')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
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
    </div>
  );
}
