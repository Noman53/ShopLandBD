import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  CreditCard,
  ChevronRight,
  Download
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice, formatDate } from '@/lib/formatters';
import { useStoreSettings } from '@/hooks/useAdmin';
import { escapeHtml } from '@/lib/sanitize';
import OrderTrackingTimeline from './OrderTrackingTimeline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name_bn: string;
  product_name_en: string;
  quantity: number;
  price: number;
  product?: {
    images: string[] | null;
  } | null;
}

interface Order {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  order_status: string;
  payment_status: string;
  payment_method: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  notes?: string | null;
  order_items?: OrderItem[];
}

interface OrderDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

const statusTimeline = [
  { status: 'pending', icon: Clock, labelBn: 'পেন্ডিং', labelEn: 'Pending' },
  { status: 'confirmed', icon: CheckCircle, labelBn: 'কনফার্মড', labelEn: 'Confirmed' },
  { status: 'shipped', icon: Truck, labelBn: 'শিপড', labelEn: 'Shipped' },
  { status: 'delivered', icon: CheckCircle, labelBn: 'ডেলিভার্ড', labelEn: 'Delivered' },
];

export default function OrderDetailsModal({ open, onOpenChange, order }: OrderDetailsModalProps) {
  const { t, language } = useLanguage();
  const { data: settings } = useStoreSettings();

  const generateOrderPDF = () => {
    if (!order) return;
    const storeName = settings?.store_name || 'ShopLandBD';
    const storePhone = settings?.store_phone || '';
    const storeEmail = settings?.store_email || '';
    const storeAddress = settings?.store_address || '';
    const storeLogo = settings?.store_logo || '';
    const deliveryCharge = Number(order.total) - Number(order.subtotal);

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order #${order.id.slice(0, 8).toUpperCase()}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 25px; border-bottom: 3px solid #10b981; padding-bottom: 20px; }
  .header h1 { color: #10b981; margin: 0; font-size: 28px; }
  .header p { color: #666; margin: 4px 0; font-size: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px; }
  .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; }
  .info-box h3 { margin: 0 0 10px 0; font-size: 13px; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-box p { margin: 4px 0; color: #555; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
  th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; border: 1px solid #ddd; }
  td { padding: 10px; border: 1px solid #eee; font-size: 12px; }
  .totals { margin-top: 5px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
  .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 8px; margin-top: 5px; }
  .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; color: #888; font-size: 11px; }
  @media print { body { padding: 20px; } }
</style></head><body>
  <div class="header">
    ${storeLogo ? `<img src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)}" style="max-height:50px;width:auto;margin-bottom:8px;" />` : ''}
    <h1>${escapeHtml(storeName)}</h1>
    ${storeAddress ? `<p>${escapeHtml(storeAddress)}</p>` : ''}
    ${storePhone ? `<p>Phone: ${escapeHtml(storePhone)}</p>` : ''}
    ${storeEmail ? `<p>Email: ${escapeHtml(storeEmail)}</p>` : ''}
    <p style="margin-top:10px;font-size:14px;font-weight:bold;">${language === 'bn' ? 'ইনভয়েস' : 'INVOICE'} #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>
    <p>${formatDate(order.created_at, language)}</p>
  </div>
  <div class="info-grid">
    <div class="info-box">
      <h3>${language === 'bn' ? 'গ্রাহক তথ্য' : 'Customer Details'}</h3>
      <p><strong>${escapeHtml(order.customer_name)}</strong></p>
      <p>${escapeHtml(order.customer_phone)}</p>
      <p>${escapeHtml(order.customer_address)}</p>
      <p>${escapeHtml(order.customer_city)}</p>
    </div>
    <div class="info-box">
      <h3>${language === 'bn' ? 'পেমেন্ট তথ্য' : 'Payment Details'}</h3>
      <p>${language === 'bn' ? 'পদ্ধতি' : 'Method'}: ${order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery'}</p>
      <p>${language === 'bn' ? 'স্ট্যাটাস' : 'Status'}: ${escapeHtml(order.payment_status)}</p>
      <p>${language === 'bn' ? 'অর্ডার স্ট্যাটাস' : 'Order Status'}: ${escapeHtml(order.order_status)}</p>
    </div>
  </div>
  <table><thead><tr>
    <th>${language === 'bn' ? 'পণ্য' : 'Product'}</th>
    <th style="text-align:center;">${language === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
    <th style="text-align:right;">${language === 'bn' ? 'দাম' : 'Price'}</th>
    <th style="text-align:right;">${language === 'bn' ? 'মোট' : 'Total'}</th>
  </tr></thead><tbody>
    ${order.order_items?.map(item => `<tr>
      <td>${escapeHtml(language === 'bn' ? item.product_name_bn : item.product_name_en)}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">${formatPrice(Number(item.price), language)}</td>
      <td style="text-align:right;">${formatPrice(Number(item.price) * item.quantity, language)}</td>
    </tr>`).join('') || ''}
  </tbody></table>
  <div class="totals">
    <div class="row"><span>${language === 'bn' ? 'সাবটোটাল' : 'Subtotal'}</span><span>${formatPrice(Number(order.subtotal), language)}</span></div>
    <div class="row"><span>${language === 'bn' ? 'ডেলিভারি চার্জ' : 'Delivery Charge'}</span><span>${deliveryCharge > 0 ? formatPrice(deliveryCharge, language) : (language === 'bn' ? 'ফ্রি' : 'Free')}</span></div>
    <div class="row total"><span>${language === 'bn' ? 'সর্বমোট' : 'Grand Total'}</span><span style="color:#10b981;">${formatPrice(Number(order.total), language)}</span></div>
  </div>
  <div class="footer">
    <p>${language === 'bn' ? 'ধন্যবাদ আপনার অর্ডারের জন্য!' : 'Thank you for your order!'}</p>
    ${storePhone ? `<p>${language === 'bn' ? 'যোগাযোগ' : 'Contact'}: ${escapeHtml(storePhone)}</p>` : ''}
  </div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
  };

  if (!order) return null;

  const getStatusIndex = (status: string) => {
    if (status === 'cancelled') return -1;
    return statusTimeline.findIndex(s => s.status === status);
  };

  const currentStatusIndex = getStatusIndex(order.order_status);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'confirmed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': 
      case 'verified': 
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': 
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected': 
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: 
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('পেন্ডিং', 'Pending');
      case 'confirmed': return t('কনফার্মড', 'Confirmed');
      case 'shipped': return t('শিপড', 'Shipped');
      case 'delivered': return t('ডেলিভার্ড', 'Delivered');
      case 'cancelled': return t('বাতিল', 'Cancelled');
      default: return status;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('পেন্ডিং', 'Pending');
      case 'paid': return t('পেইড', 'Paid');
      case 'verified': return t('ভেরিফাইড', 'Verified');
      case 'rejected': return t('রিজেক্টেড', 'Rejected');
      default: return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-10">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              {t('অর্ডার', 'Order')} #{order.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={generateOrderPDF} className="shrink-0">
              <Download className="w-4 h-4 mr-1" />
              {t('ডাউনলোড', 'Download')}
            </Button>
          </div>
          <DialogDescription>
            {formatDate(order.created_at, language)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Status Timeline */}
          {order.order_status !== 'cancelled' ? (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t('অর্ডার ট্র্যাকিং', 'Order Tracking')}</h4>
              <OrderTrackingTimeline orderId={order.id} currentStatus={order.order_status} />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <XCircle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  {t('অর্ডার বাতিল হয়েছে', 'Order Cancelled')}
                </p>
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                {order.payment_method === 'cod' ? t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery') : t('বিকাশ', 'bKash')}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
              {getPaymentStatusText(order.payment_status)}
            </span>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">{t('পণ্যসমূহ', 'Products')}</h4>
            <div className="space-y-2">
              {order.order_items?.map((item) => (
                <Link
                  key={item.id}
                  to={item.product_id ? `/products/${item.product_id}` : '#'}
                  onClick={() => item.product_id && onOpenChange(false)}
                  className={`flex items-center gap-3 p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors ${
                    item.product_id ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 rounded-lg bg-background overflow-hidden flex-shrink-0">
                    {item.product?.images && item.product.images[0] ? (
                      <img 
                        src={item.product.images[0]} 
                        alt={language === 'bn' ? item.product_name_bn : item.product_name_en}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {language === 'bn' ? item.product_name_bn : item.product_name_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatPrice(Number(item.price), language)} × {item.quantity}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {formatPrice(Number(item.price) * item.quantity, language)}
                    </span>
                    {item.product_id && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('সাবটোটাল', 'Subtotal')}</span>
              <span>{formatPrice(Number(order.subtotal), language)}</span>
            </div>
            {order.notes && (
              <div className="text-xs text-muted-foreground">{order.notes}</div>
            )}
            <div className="flex justify-between font-bold">
              <span>{t('মোট', 'Total')}</span>
              <span className="text-primary">{formatPrice(Number(order.total), language)}</span>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border-t pt-4 space-y-2">
            <h4 className="font-medium text-sm">{t('শিপিং ঠিকানা', 'Shipping Address')}</h4>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{order.customer_name}</p>
              <p>{order.customer_phone}</p>
              <p>{order.customer_address}</p>
              <p>{order.customer_city}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
