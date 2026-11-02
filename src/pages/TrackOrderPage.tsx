
import React, { useState } from 'react';
import { Search, Package, Loader2, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice, formatDate } from '@/lib/formatters';
import { isValidBDPhone, normalizeBDPhone } from '@/lib/validation';
import OrderTrackingTimeline from '@/components/OrderTrackingTimeline';
import SEO from '@/components/SEO';

interface TrackedOrder {
  id: string;
  customer_name: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  subtotal: number;
  created_at: string;
  items: Array<{
    id: string;
    product_name_bn: string;
    product_name_en: string;
    quantity: number;
    price: number;
  }>;
  history: Array<{
    id: string;
    status: string;
    note: string | null;
    created_at: string;
  }>;
}

export default function TrackOrderPage() {
  const { t, language } = useLanguage();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOrder(null);

    const trimmedId = orderId.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedId) {
      setError(t('অর্ডার আইডি দিন', 'Please enter your Order ID'));
      return;
    }

    // Phone is optional — validate only if provided
    if (trimmedPhone && !isValidBDPhone(trimmedPhone)) {
      setError(t('সঠিক ফোন নম্বর দিন (01XXXXXXXXX)', 'Enter a valid phone number (01XXXXXXXXX)'));
      return;
    }

    const cleanId = trimmedId.replace(/^#/, '').toLowerCase();
    const normalizedPhone = trimmedPhone ? normalizeBDPhone(trimmedPhone) : null;

    setLoading(true);
    setSearched(true);

    try {
      // 1. Try RPC track_order_public when phone is provided
      if (normalizedPhone) {
        const { data, error: rpcError } = await supabase.rpc('track_order_public', {
          p_order_id: cleanId,
          p_phone: normalizedPhone,
        });

        if (!rpcError && data) {
          setOrder(data as unknown as TrackedOrder);
          return;
        }
      }

      // 2. Direct lookup by order ID only (phone is optional filter)
      let query = supabase
        .from('orders')
        .select(`
          id, customer_name, order_status, payment_method, payment_status, total, subtotal, created_at,
          order_items (id, product_name_bn, product_name_en, quantity, price),
          order_status_history (id, status, note, created_at)
        `)
        .ilike('id', `${cleanId}%`);

      // Apply phone filter only when provided
      if (normalizedPhone) {
        query = query.eq('customer_phone', normalizedPhone);
      }

      const { data: directOrders, error: directError } = await query.limit(1);

      if (!directError && directOrders && directOrders.length > 0) {
        const row = directOrders[0] as any;
        setOrder({
          id: row.id,
          customer_name: row.customer_name,
          order_status: row.order_status,
          payment_method: row.payment_method,
          payment_status: row.payment_status,
          total: row.total,
          subtotal: row.subtotal,
          created_at: row.created_at,
          items: row.order_items || [],
          history: row.order_status_history || [],
        });
      } else {
        setError(t(
          'অর্ডার পাওয়া যায়নি। অর্ডার আইডিটি সঠিক আছে কিনা যাচাই করুন।',
          'Order not found. Please check your Order ID.'
        ));
      }
    } catch {
      setError(t(
        'অর্ডার পাওয়া যায়নি। অর্ডার আইডিটি সঠিক আছে কিনা যাচাই করুন।',
        'Order not found. Please check your Order ID.'
      ));
    } finally {
      setLoading(false);
    }
  };

  const statusLabelMap: Record<string, { bn: string; en: string }> = {
    pending: { bn: 'পেন্ডিং', en: 'Pending' },
    confirmed: { bn: 'কনফার্মড', en: 'Confirmed' },
    shipped: { bn: 'শিপড', en: 'Shipped' },
    delivered: { bn: 'ডেলিভার্ড', en: 'Delivered' },
    cancelled: { bn: 'বাতিল', en: 'Cancelled' },
  };

  const paymentStatusMap: Record<string, { bn: string; en: string }> = {
    pending: { bn: 'পেন্ডিং', en: 'Pending' },
    verified: { bn: 'ভেরিফাইড', en: 'Verified' },
    paid: { bn: 'পেইড', en: 'Paid' },
    failed: { bn: 'ব্যর্থ', en: 'Failed' },
  };

  return (
    <div className="min-h-screen bg-background safe-bottom pb-24">
      <SEO title={t('অর্ডার ট্র্যাকিং', 'Track Order')} description="অর্ডার আইডি দিয়ে আপনার ShopLandBD অর্ডারের লাইভ স্ট্যাটাস ট্র্যাক করুন।" canonical="/track-order" />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {t('অর্ডার ট্র্যাক করুন', 'Track Your Order')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t(
              'অর্ডার আইডি দিয়ে আপনার অর্ডারের বর্তমান অবস্থা দেখুন',
              'Enter your Order ID to check your order status'
            )}
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-6">
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order ID — Required */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('অর্ডার আইডি', 'Order ID')}
                  <span className="text-destructive ml-1">*</span>
                </label>
                <Input
                  placeholder={t('অর্ডার আইডি পেস্ট করুন (যেমন: A1B2C3D4)', 'Paste your Order ID (e.g. A1B2C3D4)')}
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Phone — Optional */}
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {t('ফোন নম্বর', 'Phone Number')}
                  <span className="text-muted-foreground text-xs ml-2">
                    {t('(ঐচ্ছিক)', '(optional)')}
                  </span>
                </label>
                <Input
                  placeholder="01XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {t('ট্র্যাক করুন', 'Track Order')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        {order && (
          <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
            {/* Order Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t('অর্ডার সারাংশ', 'Order Summary')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('অর্ডার আইডি', 'Order ID')}</p>
                    <p className="font-mono font-medium text-primary">#{order.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('তারিখ', 'Date')}</p>
                    <p className="font-medium">{formatDate(order.created_at, language)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('স্ট্যাটাস', 'Status')}</p>
                    <p className="font-medium">
                      {language === 'bn'
                        ? statusLabelMap[order.order_status]?.bn || order.order_status
                        : statusLabelMap[order.order_status]?.en || order.order_status}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('পেমেন্ট', 'Payment')}</p>
                    <p className="font-medium">
                      {order.payment_method === 'bkash' ? 'bKash' : 'COD'} —{' '}
                      {language === 'bn'
                        ? paymentStatusMap[order.payment_status]?.bn || order.payment_status
                        : paymentStatusMap[order.payment_status]?.en || order.payment_status}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t pt-3 space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">
                          {language === 'bn' ? item.product_name_bn : item.product_name_en}
                        </span>
                        <span className="text-muted-foreground ml-1">×{item.quantity}</span>
                      </div>
                      <span>{formatPrice(Number(item.price) * item.quantity, language)}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="border-t pt-3 flex justify-between items-center">
                  <span className="font-bold">{t('সর্বমোট', 'Total')}</span>
                  <span className="font-bold text-lg text-primary">{formatPrice(Number(order.total), language)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            {order.history && order.history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    {t('অর্ডার টাইমলাইন', 'Order Timeline')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <OrderTrackingTimeline orderId={order.id} currentStatus={order.order_status} />
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* No result message */}
        {searched && !loading && !order && !error && (
          <Card className="text-center p-8">
            <p className="text-muted-foreground">
              {t('অর্ডার পাওয়া যায়নি।', 'No order found.')}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
