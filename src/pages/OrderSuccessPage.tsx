import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, Home, ShoppingBag, Download, Package, Phone, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, formatDate } from '@/lib/formatters';
import { useStoreSettings } from '@/hooks/useAdmin';
import { escapeHtml } from '@/lib/sanitize';
import SEO from '@/components/SEO';

interface OrderItem {
  id: string;
  product_name_bn: string;
  product_name_en: string;
  quantity: number;
  price: number;
}

interface OrderDetails {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  total: number;
  subtotal: number;
  payment_method: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function OrderSuccessPage() {
  const { t, language } = useLanguage();
  const location = useLocation();
  const orderId = location.state?.orderId;
  const orderDataFromState = location.state?.orderData as OrderDetails | undefined;
  const [order, setOrder] = useState<OrderDetails | null>(orderDataFromState || null);
  const [loading, setLoading] = useState(!orderDataFromState);
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || order) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, customer_name, customer_phone, customer_address, customer_city,
          total, subtotal, payment_method, created_at,
          order_items (id, product_name_bn, product_name_en, quantity, price)
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (!error && data) {
        setOrder(data);
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId]);

  const generateInvoice = () => {
    if (!order) return;

    // Create invoice content
    const invoiceContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
    .header h1 { color: #10b981; margin: 0; font-size: 28px; }
    .header p { color: #666; margin: 5px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
    .info-section h3 { color: #333; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; }
    .info-section p { margin: 5px 0; color: #555; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f8f9fa; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #666; }
    td { padding: 12px; border-bottom: 1px solid #eee; }
    .total-row { font-weight: bold; font-size: 18px; }
    .total-row td { border-top: 2px solid #333; padding-top: 15px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #888; font-size: 12px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    ${settings?.store_logo ? `<img src="${escapeHtml(settings.store_logo)}" alt="${escapeHtml(settings?.store_name || 'ShopLandBD')}" style="max-height:60px;width:auto;margin-bottom:10px;" />` : ''}
    <h1>${escapeHtml(settings?.store_name || 'ShopLandBD')}</h1>
    <p>${language === 'bn' ? 'ইনভয়েস' : 'Invoice'} #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>
    <p>${formatDate(order.created_at, language)}</p>
  </div>
  
  <div class="info-grid">
    <div class="info-section">
      <h3>${language === 'bn' ? 'দোকান তথ্য' : 'Shop Info'}</h3>
      <p><strong>${escapeHtml(settings?.store_name || 'ShopLandBD')}</strong></p>
      ${settings?.store_phone ? `<p>${escapeHtml(settings.store_phone)}</p>` : ''}
      ${settings?.store_email ? `<p>${escapeHtml(settings.store_email)}</p>` : ''}
      ${settings?.store_address ? `<p>${escapeHtml(settings.store_address)}</p>` : ''}
    </div>
    <div class="info-section" style="text-align: right;">
      <h3>${language === 'bn' ? 'গ্রাহক তথ্য' : 'Customer Info'}</h3>
      <p><strong>${escapeHtml(order.customer_name)}</strong></p>
      <p>${escapeHtml(order.customer_phone)}</p>
      <p>${escapeHtml(order.customer_address)}</p>
      <p>${escapeHtml(order.customer_city)}</p>
    </div>
  </div>
  
  <div class="info-grid" style="margin-bottom: 20px;">
    <div class="info-section">
      <h3>${language === 'bn' ? 'পেমেন্ট তথ্য' : 'Payment Info'}</h3>
      <p>${language === 'bn' ? 'পেমেন্ট মেথড' : 'Payment Method'}: ${order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery'}</p>
      <p>${language === 'bn' ? 'স্ট্যাটাস' : 'Status'}: ${language === 'bn' ? 'পেন্ডিং' : 'Pending'}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${language === 'bn' ? 'পণ্য' : 'Product'}</th>
        <th style="text-align: center;">${language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
        <th style="text-align: right;">${language === 'bn' ? 'দাম' : 'Price'}</th>
        <th style="text-align: right;">${language === 'bn' ? 'মোট' : 'Total'}</th>
      </tr>
    </thead>
    <tbody>
      ${order.order_items.map(item => `
        <tr>
          <td>${escapeHtml(language === 'bn' ? item.product_name_bn : item.product_name_en)}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatPrice(Number(item.price), language)}</td>
          <td style="text-align: right;">${formatPrice(Number(item.price) * item.quantity, language)}</td>
        </tr>
      `).join('')}
      <tr>
        <td colspan="3" style="text-align: right; padding-top: 10px;">${language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</td>
        <td style="text-align: right; padding-top: 10px;">${formatPrice(Number(order.subtotal), language)}</td>
      </tr>
      <tr>
        <td colspan="3" style="text-align: right;">${language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</td>
        <td style="text-align: right;">${
          Number(order.total) - Number(order.subtotal) <= 0
            ? `<span style="color: #10b981;">${language === 'bn' ? 'ফ্রি' : 'Free'}</span>`
            : formatPrice(Number(order.total) - Number(order.subtotal), language)
        }</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" style="text-align: right;">${language === 'bn' ? 'সর্বমোট' : 'Total'}</td>
        <td style="text-align: right; color: #10b981;">${formatPrice(Number(order.total), language)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>${language === 'bn' ? 'ধন্যবাদ আপনার অর্ডারের জন্য!' : 'Thank you for your order!'}</p>
    ${settings?.store_phone ? `<p>${language === 'bn' ? 'যোগাযোগ' : 'Contact'}: ${escapeHtml(settings.store_phone)}</p>` : ''}
  </div>
</body>
</html>`;

    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom pb-24">
      <SEO title={t('অর্ডার সফল', 'Order Successful')} description="আপনার ShopLandBD অর্ডার সফলভাবে গৃহীত হয়েছে। অর্ডার ডিটেইলস ও ট্র্যাকিং তথ্য দেখুন।" canonical="/order-success" noindex />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-bounce-once">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {t('অর্ডার সফল হয়েছে! 🎉', 'Order Placed Successfully! 🎉')}
          </h1>

          <p className="text-muted-foreground">
            {t(
              'ধন্যবাদ আপনার অর্ডারের জন্য। আমরা শীঘ্রই আপনার সাথে যোগাযোগ করব।',
              'Thank you for your order. We will contact you shortly.'
            )}
          </p>

          {orderId && (
            <p className="text-sm text-muted-foreground mt-2">
              {t('অর্ডার আইডি', 'Order ID')}: <span className="font-mono font-bold text-primary">#{orderId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
        </div>

        {/* Order Summary Card */}
        {order && (
          <Card className="mb-6">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t('অর্ডার সারাংশ', 'Order Summary')}
                </h2>
                <Button variant="outline" size="sm" onClick={generateInvoice}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('ইনভয়েস', 'Invoice')}
                </Button>
              </div>

              {/* Order Items */}
              <div className="space-y-3 mb-4">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium text-sm">
                        {language === 'bn' ? item.product_name_bn : item.product_name_en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(Number(item.price), language)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatPrice(Number(item.price) * item.quantity, language)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="font-bold">{t('মোট', 'Total')}</span>
                <span className="font-bold text-lg text-primary">
                  {formatPrice(Number(order.total), language)}
                </span>
              </div>

              {/* Delivery Info */}
              <div className="mt-4 pt-4 border-t text-sm">
                <p className="text-muted-foreground mb-1">{t('ডেলিভারি ঠিকানা', 'Delivery Address')}:</p>
                <p className="font-medium">{order.customer_name}</p>
                <p>{order.customer_address}, {order.customer_city}</p>
                <p className="flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {order.customer_phone}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thank You Message */}
        <Card className="mb-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 md:p-6 text-center">
            <p className="text-lg mb-2">
              {t('💚 আপনার অর্ডারের জন্য ধন্যবাদ!', '💚 Thank you for your order!')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(
                'আমরা আপনার অর্ডার প্রক্রিয়াকরণ শুরু করেছি। ডেলিভারির আগে আমরা আপনাকে কল করব।',
                'We have started processing your order. We will call you before delivery.'
              )}
            </p>
            {settings?.store_phone && (
              <p className="mt-3 text-sm">
                {t('যোগাযোগ করুন', 'Contact us')}: <a href={`tel:${settings.store_phone}`} className="font-medium text-primary">{settings.store_phone}</a>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="w-4 h-4 mr-2" />
              {t('হোমে যান', 'Go Home')}
            </Button>
          </Link>
          <Link to="/track-order" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Package className="w-4 h-4 mr-2" />
              {t('অর্ডার ট্র্যাক করুন', 'Track Order')}
            </Button>
          </Link>
          <Link to="/products" className="flex-1">
            <Button className="w-full" size="lg">
              <ShoppingBag className="w-4 h-4 mr-2" />
              {t('আরও শপিং', 'Continue Shopping')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
