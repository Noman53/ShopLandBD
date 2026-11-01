import React, { useMemo } from 'react';
import { 
  ShoppingCart, 
  CreditCard, 
  Truck, 
  CheckCircle,
  XCircle,
  Clock,
  Package
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Order {
  id: string;
  customer_name: string;
  total: number;
  order_status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

interface RecentActivityProps {
  orders: Order[];
}

export function RecentActivity({ orders }: RecentActivityProps) {
  const { t, language } = useLanguage();

  const activities = useMemo(() => {
    // Get the most recent 10 activities based on updated_at
    return orders
      .slice()
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8)
      .map(order => {
        let icon = ShoppingCart;
        let color = 'text-blue-500 bg-blue-500/10';
        let action = t('নতুন অর্ডার', 'New order');

        switch (order.order_status) {
          case 'confirmed':
            icon = CheckCircle;
            color = 'text-blue-500 bg-blue-500/10';
            action = t('কনফার্ম করা হয়েছে', 'Confirmed');
            break;
          case 'shipped':
            icon = Truck;
            color = 'text-purple-500 bg-purple-500/10';
            action = t('শিপ করা হয়েছে', 'Shipped');
            break;
          case 'delivered':
            icon = Package;
            color = 'text-green-500 bg-green-500/10';
            action = t('ডেলিভারি সম্পন্ন', 'Delivered');
            break;
          case 'cancelled':
            icon = XCircle;
            color = 'text-red-500 bg-red-500/10';
            action = t('বাতিল করা হয়েছে', 'Cancelled');
            break;
          case 'pending':
          default:
            if (order.payment_method === 'bkash' && order.payment_status === 'verified') {
              icon = CreditCard;
              color = 'text-pink-500 bg-pink-500/10';
              action = t('পেমেন্ট যাচাই', 'Payment verified');
            } else {
              icon = Clock;
              color = 'text-yellow-500 bg-yellow-500/10';
              action = t('নতুন অর্ডার', 'New order');
            }
            break;
        }

        return {
          id: order.id,
          icon,
          color,
          action,
          customer: order.customer_name,
          amount: Number(order.total),
          time: order.updated_at,
        };
      });
  }, [orders, t]);

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  if (activities.length === 0) {
    return null;
  }

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <h3 className="font-semibold mb-4">{t('সাম্প্রতিক কার্যক্রম', 'Recent Activity')}</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={`${activity.id}-${activity.time}`} className="flex items-start gap-3">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', activity.color)}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{activity.action}</span>
                <span className="text-muted-foreground"> - {activity.customer}</span>
              </p>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {formatDate(activity.time, language)}
                </span>
                <span className="text-xs font-medium text-green-600">
                  {priceDisplay(activity.amount)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
