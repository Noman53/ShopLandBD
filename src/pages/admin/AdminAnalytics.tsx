import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Package, AlertTriangle, Wallet, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminOrders, useAdminProducts } from '@/hooks/useAdmin';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatPrice } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AdminAnalytics() {
  const { t, language } = useLanguage();
  const { data: orders } = useAdminOrders();
  const { data: products } = useAdminProducts();

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!orders) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Filter completed orders
    const completedOrders = orders.filter(o => 
      o.order_status !== 'cancelled' && o.payment_status !== 'failed'
    );

    // Today's revenue
    const todayRevenue = completedOrders
      .filter(o => new Date(o.created_at) >= today)
      .reduce((sum, o) => sum + Number(o.total), 0);

    // This month's revenue
    const thisMonthRevenue = completedOrders
      .filter(o => new Date(o.created_at) >= thisMonthStart)
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Last month's revenue
    const lastMonthRevenue = completedOrders
      .filter(o => {
        const date = new Date(o.created_at);
        return date >= lastMonthStart && date <= lastMonthEnd;
      })
      .reduce((sum, o) => sum + Number(o.total), 0);

    // Payment method breakdown
    const codOrders = completedOrders.filter(o => o.payment_method === 'cod');
    const bkashOrders = completedOrders.filter(o => o.payment_method === 'bkash');
    
    const codRevenue = codOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const bkashRevenue = bkashOrders.reduce((sum, o) => sum + Number(o.total), 0);

    // Daily revenue for last 7 days
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayRevenue = completedOrders
        .filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= dayStart && orderDate < dayEnd;
        })
        .reduce((sum, o) => sum + Number(o.total), 0);

      dailyData.push({
        date: dayStart.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' }),
        revenue: dayRevenue,
      });
    }

    // Best selling products
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach(order => {
      if (order.order_status === 'cancelled') return;
      order.order_items?.forEach((item: any) => {
        const key = item.product_id || item.product_name_en;
        if (!productSales[key]) {
          productSales[key] = {
            name: language === 'bn' ? item.product_name_bn : item.product_name_en,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[key].quantity += item.quantity;
        productSales[key].revenue += Number(item.price) * item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      todayRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      monthlyGrowth: lastMonthRevenue > 0 
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : 0,
      codRevenue,
      bkashRevenue,
      codCount: codOrders.length,
      bkashCount: bkashOrders.length,
      dailyData,
      topProducts,
      totalOrders: completedOrders.length,
    };
  }, [orders, language]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products
      .filter(p => p.is_active && p.stock_quantity <= 5)
      .sort((a, b) => a.stock_quantity - b.stock_quantity)
      .slice(0, 10);
  }, [products]);

  const paymentPieData = analytics ? [
    { name: language === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery', value: analytics.codRevenue, count: analytics.codCount },
    { name: 'bKash', value: analytics.bkashRevenue, count: analytics.bkashCount },
  ] : [];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--bkash))'];

  if (!analytics) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {t('বিশ্লেষণ', 'Analytics')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('বিক্রয় এবং পারফরম্যান্স বিশ্লেষণ', 'Sales and performance analytics')}
          </p>
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{priceDisplay(analytics.todayRevenue)}</p>
            <p className="text-sm text-muted-foreground">{t('আজকের আয়', 'Today\'s Revenue')}</p>
          </div>

          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{priceDisplay(analytics.thisMonthRevenue)}</p>
            <p className="text-sm text-muted-foreground">{t('এই মাসের আয়', 'This Month')}</p>
            {Number(analytics.monthlyGrowth) !== 0 && (
              <p className={`text-xs mt-1 ${Number(analytics.monthlyGrowth) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Number(analytics.monthlyGrowth) > 0 ? '+' : ''}{analytics.monthlyGrowth}% {t('গত মাস থেকে', 'from last month')}
              </p>
            )}
          </div>

          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{analytics.totalOrders}</p>
            <p className="text-sm text-muted-foreground">{t('মোট অর্ডার', 'Total Orders')}</p>
          </div>

          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <p className="text-2xl font-bold">{lowStockProducts.length}</p>
            <p className="text-sm text-muted-foreground">{t('স্টক কম', 'Low Stock Items')}</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Daily Revenue Chart */}
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <h3 className="font-semibold mb-4">{t('সাপ্তাহিক আয়', 'Weekly Revenue')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => [priceDisplay(value), t('আয়', 'Revenue')]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Method Pie Chart */}
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <h3 className="font-semibold mb-4">{t('পেমেন্ট পদ্ধতি', 'Payment Methods')}</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string, entry: any) => [
                      `${priceDisplay(value)} (${entry.payload.count} ${t('অর্ডার', 'orders')})`,
                      name
                    ]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span>{t('COD:', 'COD:')} {priceDisplay(analytics.codRevenue)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-bkash" />
                <span>bKash: {priceDisplay(analytics.bkashRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <h3 className="font-semibold mb-4">{t('সেরা বিক্রিত পণ্য', 'Best Selling Products')}</h3>
            <div className="space-y-3">
              {analytics.topProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('কোন ডেটা নেই', 'No data')}</p>
              ) : (
                analytics.topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.quantity} {t('টি বিক্রি', 'sold')}
                        </p>
                      </div>
                    </div>
                    <span className="font-medium text-sm">{priceDisplay(product.revenue)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              {t('স্টক সতর্কতা', 'Low Stock Alert')}
            </h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {lowStockProducts.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('সব স্টক ঠিক আছে', 'All stock levels are good')}</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">
                        {language === 'bn' ? product.name_bn : product.name_en}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ID: #{product.id.slice(0, 8)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      product.stock_quantity === 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.stock_quantity} {t('টি', 'left')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
