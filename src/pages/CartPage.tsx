import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/formatters';
import SEO from '@/components/SEO';

export default function CartPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, subtotal, total, itemCount } = useCart();

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  if (items.length === 0) {
    return (
      <div className="page-enter min-h-screen bg-background safe-bottom flex flex-col items-center justify-center p-4">
        <SEO title={t('শপিং কার্ট', 'Shopping Cart')} description="আপনার ShopLandBD শপিং কার্ট দেখুন ও পণ্য যোগ করুন। সহজে চেকআউট করুন।" canonical="/cart" noindex />
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {t('আপনার কার্ট খালি', 'Your cart is empty')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('পণ্য যোগ করুন এবং শপিং শুরু করুন!', 'Add products and start shopping!')}
          </p>
          <Link to="/products">
            <Button size="lg">
              {t('শপিং করুন', 'Start Shopping')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-background safe-bottom">
      <SEO title={t('শপিং কার্ট', 'Shopping Cart')} description="আপনার ShopLandBD শপিং কার্ট দেখুন, পরিমাণ আপডেট করুন এবং চেকআউটে এগিয়ে যান।" canonical="/cart" noindex />
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          {t('শপিং কার্ট', 'Shopping Cart')} ({itemCount})
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="store-card flex gap-4 border bg-card p-4"
              >
                {/* Product Image */}
                <Link to={`/products/${item.productId}`} className="flex-shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg overflow-hidden bg-secondary">
                    <img
                      src={item.image || '/product-placeholder.svg'}
                      alt={language === 'bn' ? item.name_bn : item.name_en}
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        if (!event.currentTarget.currentSrc.endsWith('/product-placeholder.svg')) {
                          event.currentTarget.src = '/product-placeholder.svg';
                        }
                      }}
                    />
                  </div>
                </Link>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${item.productId}`}>
                    <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                      {language === 'bn' ? item.name_bn : item.name_en}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-2 mt-1">
                    {item.discount_price ? (
                      <>
                        <span className="font-bold text-primary">
                          {priceDisplay(item.discount_price)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {priceDisplay(item.price)}
                        </span>
                      </>
                    ) : (
                      <span className="font-bold text-primary">
                        {priceDisplay(item.price)}
                      </span>
                    )}
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="p-2 hover:bg-secondary transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="p-2 hover:bg-secondary transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Item Total - Desktop */}
                <div className="hidden md:flex flex-col items-end justify-center">
                  <span className="text-sm text-muted-foreground">
                    {t('মোট', 'Total')}
                  </span>
                  <span className="font-bold text-lg">
                    {priceDisplay((item.discount_price ?? item.price) * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="store-card sticky top-[160px] border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold mb-4">
                {t('অর্ডার সারাংশ', 'Order Summary')}
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('সাবটোটাল', 'Subtotal')} ({itemCount} {t('টি পণ্য', 'items')})
                  </span>
                  <span className="font-medium">{priceDisplay(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('ডেলিভারি', 'Delivery')}
                  </span>
                  <span className="font-medium text-success">
                    {t('চেকআউটে দেখুন', 'See at checkout')}
                  </span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold">{t('মোট', 'Total')}</span>
                    <span className="font-bold text-xl text-primary">
                      {priceDisplay(total)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate('/checkout')}
                size="lg"
                className="w-full"
              >
                {t('চেকআউট করুন', 'Proceed to Checkout')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Link to="/products" className="block mt-4">
                <Button variant="outline" className="w-full">
                  {t('শপিং চালিয়ে যান', 'Continue Shopping')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
