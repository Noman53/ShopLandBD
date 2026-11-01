import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, DollarSign, AlertTriangle, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminOrders, useAdminProducts } from '@/hooks/useAdmin';
import { useActiveFlashSale } from '@/hooks/useFlashSales';
import { useComputedProductStock } from '@/hooks/useComputedProductStock';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatPrice, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DashboardMetrics } from '@/components/admin/DashboardMetrics';
import { RevenueChart, PaymentMethodChart, OrderStatusChart } from '@/components/admin/DashboardCharts';
import { TopSellingProducts } from '@/components/admin/TopSellingProducts';
import { QuickActions, FloatingQuickActions } from '@/components/admin/QuickActions';
import { RecentActivity } from '@/components/admin/RecentActivity';

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { data: orders } = useAdminOrders();
  const { data: products } = useAdminProducts();
  const { data: activeFlashSale } = useActiveFlashSale();

  const { stockByProductId } = useComputedProductStock(products);

  const productsWithComputedStock = React.useMemo(() => {
    return (products ?? []).map((p) => ({
      ...p,
      stock_quantity: stockByProductId.get(p.id) ?? p.stock_quantity,
    }));
  }, [products, stockByProductId]);

  const stats = {
    totalOrders: orders?.length || 0,
    pendingOrders: orders?.filter(o => o.order_status === 'pending').length || 0,
    totalProducts: productsWithComputedStock.length || 0,
    totalRevenue: orders?.filter(o => o.order_status === 'delivered').reduce((sum, o) => sum + Number(o.total), 0) || 0,
    lowStockProducts: productsWithComputedStock.filter(p => p.stock_quantity > 0 && p.stock_quantity < 10).length || 0,
  };

  const recentOrders = orders?.slice(0, 5) || [];

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    const labels: Record<string, [string, string]> = {
      pending: ['পেন্ডিং', 'Pending'],
      confirmed: ['কনফার্মড', 'Confirmed'],
      shipped: ['শিপড', 'Shipped'],
      delivered: ['ডেলিভার্ড', 'Delivered'],
      cancelled: ['বাতিল', 'Cancelled'],
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {t(labels[status]?.[0] || status, labels[status]?.[1] || status)}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t('ড্যাশবোর্ড', 'Dashboard')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('আপনার স্টোরের ওভারভিউ', 'Overview of your store')}
          </p>
        </div>

        {/* Active Flash Sale Banner */}
        {activeFlashSale && (
          <div
            onClick={() => navigate('/admin/flash-sales')}
            className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center animate-pulse">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">
                {t('ফ্ল্যাশ সেল চলছে!', 'Flash Sale Active!')}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' ? activeFlashSale.name_bn : activeFlashSale.name_en} - {activeFlashSale.discount_percentage}% {t('ছাড়', 'OFF')}
              </p>
            </div>
          </div>
        )}

        {/* Main Stats Grid - Serial 1 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/admin/orders')}
            className="bg-card border rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.totalOrders}</p>
            <p className="text-sm text-muted-foreground">{t('মোট অর্ডার', 'Total Orders')}</p>
          </div>

          <div
            onClick={() => navigate('/admin/orders?status=pending')}
            className="bg-card border rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-lg hover:border-yellow-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.pendingOrders}</p>
            <p className="text-sm text-muted-foreground">{t('পেন্ডিং অর্ডার', 'Pending Orders')}</p>
          </div>

          <div
            onClick={() => navigate('/admin/products')}
            className="bg-card border rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-lg hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{stats.totalProducts}</p>
            <p className="text-sm text-muted-foreground">{t('মোট পণ্য', 'Total Products')}</p>
          </div>

          <div
            onClick={() => navigate('/admin/analytics')}
            className="bg-card border rounded-xl p-4 md:p-6 cursor-pointer hover:shadow-lg hover:border-green-500/50 transition-all"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl font-bold">{priceDisplay(stats.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">{t('মোট আয়', 'Total Revenue')}</p>
          </div>
        </div>

        {/* Enhanced Metrics Grid - Serial 2 */}
        {orders && products && (
          <DashboardMetrics orders={orders} products={productsWithComputedStock} />
        )}

        {/* Quick Actions - Serial 3 */}
        <QuickActions />

        {/* Low Stock Warning */}
        {stats.lowStockProducts > 0 && (
          <div
            onClick={() => navigate('/admin/products?filter=low-stock')}
            className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:shadow-lg transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="font-semibold text-orange-700 dark:text-orange-400">
                {t('স্টক কম!', 'Low Stock Alert!')}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-500">
                {stats.lowStockProducts} {t('টি পণ্যে স্টক ১০ এর কম', 'products have stock below 10')}
              </p>
            </div>
          </div>
        )}

        {/* Top Selling Products Carousel */}
        {orders && products && (
          <TopSellingProducts orders={orders} products={products} />
        )}

        {/* Charts Grid */}
        {orders && orders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <RevenueChart orders={orders} />
            <PaymentMethodChart orders={orders} />
            <OrderStatusChart orders={orders} />
          </div>
        )}

        {/* Activity and Recent Orders Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Recent Activity */}
          {orders && orders.length > 0 && (
            <RecentActivity orders={orders} />
          )}

          {/* Recent Orders */}
          <div className="bg-card border rounded-xl">
            <div className="p-4 md:p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('সাম্প্রতিক অর্ডার', 'Recent Orders')}</h2>
              <Link
                to="/admin/orders"
                className="text-sm text-primary hover:underline"
              >
                {t('সব দেখুন', 'View All')}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium">{t('অর্ডার আইডি', 'Order ID')}</th>
                    <th className="text-left p-4 text-sm font-medium hidden sm:table-cell">{t('গ্রাহক', 'Customer')}</th>
                    <th className="text-left p-4 text-sm font-medium">{t('মোট', 'Total')}</th>
                    <th className="text-left p-4 text-sm font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                    <th className="text-left p-4 text-sm font-medium hidden md:table-cell">{t('তারিখ', 'Date')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        {t('কোন অর্ডার নেই', 'No orders yet')}
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr
                        key={order.id}
                        onClick={() => navigate('/admin/orders')}
                        className="hover:bg-secondary/30 cursor-pointer"
                      >
                        <td className="p-4 font-mono text-sm">#{order.id.slice(0, 8)}</td>
                        <td className="p-4 hidden sm:table-cell">
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                        </td>
                        <td className="p-4 font-medium">{priceDisplay(Number(order.total))}</td>
                        <td className="p-4">{getStatusBadge(order.order_status)}</td>
                        <td className="p-4 text-sm text-muted-foreground hidden md:table-cell">
                          {formatDate(order.created_at, language)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Quick Actions - Mobile Only */}
      <FloatingQuickActions />
    </AdminLayout>
  );
}
