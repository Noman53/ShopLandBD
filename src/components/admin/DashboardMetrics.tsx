import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, 
  Clock, 
  TrendingUp, 
  PackageX, 
  AlertCircle,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/formatters';

interface Order {
  id: string;
  total: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

interface Product {
  id: string;
  stock_quantity: number;
  is_active: boolean;
}

interface DashboardMetricsProps {
  orders: Order[];
  products: Product[];
}

export function DashboardMetrics({ orders, products }: DashboardMetricsProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];
  
  const metrics = {
    pendingBkash: orders.filter(o => 
      o.payment_method === 'bkash' && o.payment_status === 'pending'
    ).length,
    lowStock: products.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length,
    outOfStock: products.filter(p => p.stock_quantity === 0 && p.is_active).length,
    todayOrders: orders.filter(o => 
      new Date(o.created_at).toISOString().split('T')[0] === today
    ).length,
    todayRevenue: orders.filter(o => 
      new Date(o.created_at).toISOString().split('T')[0] === today && 
      o.order_status === 'delivered'
    ).reduce((sum, o) => sum + Number(o.total), 0),
    needsAttention: orders.filter(o => 
      o.order_status === 'pending' && 
      new Date(o.created_at) < new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length,
    verifiedBkash: orders.filter(o => 
      o.payment_method === 'bkash' && o.payment_status === 'verified'
    ).length,
    rejectedBkash: orders.filter(o => 
      o.payment_method === 'bkash' && o.payment_status === 'failed'
    ).length,
  };

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {/* Pending bKash */}
      <div 
        onClick={() => navigate('/admin/orders?payment=bkash_pending')}
        className="bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/30 dark:to-pink-900/20 border border-pink-200 dark:border-pink-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all group"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-pink-600" />
          </div>
          <span className="text-xs text-pink-600 dark:text-pink-400 font-medium">bKash</span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-pink-700 dark:text-pink-300">{metrics.pendingBkash}</p>
        <p className="text-xs text-pink-600 dark:text-pink-400">{t('যাচাই বাকি', 'Pending Verification')}</p>
      </div>

      {/* Today's Orders */}
      <div 
        onClick={() => navigate(`/admin/orders?date=${today}`)}
        className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{t('আজ', 'Today')}</span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-blue-700 dark:text-blue-300">{metrics.todayOrders}</p>
        <p className="text-xs text-blue-600 dark:text-blue-400">{t('নতুন অর্ডার', 'New Orders')}</p>
      </div>

      {/* Today's Revenue */}
      <div 
        onClick={() => navigate('/admin/analytics')}
        className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200 dark:border-green-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <span className="text-xs text-green-600 dark:text-green-400 font-medium">{t('আজ', 'Today')}</span>
        </div>
        <p className="text-lg md:text-xl font-bold text-green-700 dark:text-green-300">{priceDisplay(metrics.todayRevenue)}</p>
        <p className="text-xs text-green-600 dark:text-green-400">{t('আয়', 'Revenue')}</p>
      </div>

      {/* Needs Attention */}
      <div 
        onClick={() => navigate('/admin/orders?status=pending')}
        className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20 border border-orange-200 dark:border-orange-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-orange-600" />
          </div>
          <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{t('জরুরি', 'Urgent')}</span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-orange-700 dark:text-orange-300">{metrics.needsAttention}</p>
        <p className="text-xs text-orange-600 dark:text-orange-400">{t('২৪ ঘণ্টা+', '24h+ Pending')}</p>
      </div>

      {/* Stock Status Row */}
      <div 
        onClick={() => navigate('/admin/products?filter=low-stock')}
        className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <PackageX className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-bold text-amber-700 dark:text-amber-300">{metrics.lowStock}</p>
        <p className="text-xs text-amber-600 dark:text-amber-400">{t('স্টক কম', 'Low Stock')}</p>
      </div>

      <div 
        onClick={() => navigate('/admin/products?filter=out-of-stock')}
        className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200 dark:border-red-900 rounded-xl p-3 md:p-4 cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
        </div>
        <p className="text-xl md:text-2xl font-bold text-red-700 dark:text-red-300">{metrics.outOfStock}</p>
        <p className="text-xs text-red-600 dark:text-red-400">{t('স্টক আউট', 'Out of Stock')}</p>
      </div>

      {/* bKash Verified */}
      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">bKash</span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-emerald-700 dark:text-emerald-300">{metrics.verifiedBkash}</p>
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{t('যাচাইকৃত', 'Verified')}</p>
      </div>

      {/* bKash Rejected */}
      <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl p-3 md:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
            <XCircle className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">bKash</span>
        </div>
        <p className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300">{metrics.rejectedBkash}</p>
        <p className="text-xs text-slate-600 dark:text-slate-400">{t('বাতিল', 'Rejected')}</p>
      </div>
    </div>
  );
}
