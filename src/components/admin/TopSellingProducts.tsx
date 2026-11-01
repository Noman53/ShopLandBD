import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface OrderItem {
  product_id: string | null;
  product_name_bn: string;
  product_name_en: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  order_status: string;
  order_items: OrderItem[];
}

interface Product {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  discount_price: number | null;
  images: string[] | null;
  stock_quantity: number;
}

interface TopSellingProductsProps {
  orders: Order[];
  products: Product[];
}

export function TopSellingProducts({ orders, products }: TopSellingProductsProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const topProducts = useMemo(() => {
    const productSales: Record<string, { quantity: number; revenue: number }> = {};
    
    orders.forEach(order => {
      if (order.order_status !== 'cancelled') {
        order.order_items?.forEach(item => {
          if (item.product_id) {
            if (!productSales[item.product_id]) {
              productSales[item.product_id] = { quantity: 0, revenue: 0 };
            }
            productSales[item.product_id].quantity += item.quantity;
            productSales[item.product_id].revenue += item.quantity * Number(item.price);
          }
        });
      }
    });

    return Object.entries(productSales)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, 10)
      .map(([productId, sales]) => {
        const product = products.find(p => p.id === productId);
        return product ? { ...product, ...sales } : null;
      })
      .filter(Boolean) as (Product & { quantity: number; revenue: number })[];
  }, [orders, products]);

  if (topProducts.length === 0) {
    return null;
  }

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold">{t('সেরা বিক্রিত পণ্য', 'Top Selling Products')}</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/admin/products')}
          className="text-xs"
        >
          {t('সব দেখুন', 'View All')}
        </Button>
      </div>

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {topProducts.map((product, index) => (
            <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
              <div 
                onClick={() => navigate(`/products/${product.id}`)}
                className="bg-secondary/30 rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors h-full"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    #{index + 1}
                  </span>
                </div>
                {product.images?.[0] && (
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-background">
                    <img 
                      src={product.images[0]} 
                      alt={language === 'bn' ? product.name_bn : product.name_en}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <p className="text-sm font-medium line-clamp-2 mb-1">
                  {language === 'bn' ? product.name_bn : product.name_en}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {product.quantity} {t('বিক্রি', 'sold')}
                  </span>
                  <span className="font-medium text-green-600">
                    {priceDisplay(product.revenue)}
                  </span>
                </div>
                <div className="mt-2 text-xs">
                  <span className={`${product.stock_quantity < 10 ? 'text-orange-500' : 'text-muted-foreground'}`}>
                    {t('স্টক:', 'Stock:')} {product.stock_quantity}
                  </span>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
    </div>
  );
}
