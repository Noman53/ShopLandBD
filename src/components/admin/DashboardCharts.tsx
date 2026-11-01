import React, { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatPrice } from '@/lib/formatters';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';

interface Order {
  id: string;
  total: number;
  payment_method: string;
  order_status: string;
  created_at: string;
}

interface DashboardChartsProps {
  orders: Order[];
}

export function RevenueChart({ orders }: DashboardChartsProps) {
  const { t, language } = useLanguage();

  const weeklyData = useMemo(() => {
    const now = new Date();
    const days = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at).toISOString().split('T')[0];
        return orderDate === dateStr && o.order_status === 'delivered';
      });
      
      const revenue = dayOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const dayName = date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'short' });
      
      days.push({
        day: dayName,
        revenue,
        orders: dayOrders.length,
      });
    }
    
    return days;
  }, [orders, language]);

  const chartConfig: ChartConfig = {
    revenue: {
      label: t('আয়', 'Revenue'),
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <h3 className="font-semibold mb-4">{t('সাপ্তাহিক আয়', 'Weekly Revenue')}</h3>
      <ChartContainer config={chartConfig} className="h-[200px] w-full">
        <BarChart data={weeklyData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="day" className="text-xs" />
          <YAxis className="text-xs" />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function PaymentMethodChart({ orders }: DashboardChartsProps) {
  const { t } = useLanguage();

  const data = useMemo(() => {
    const cod = orders.filter(o => o.payment_method === 'cod').length;
    const bkash = orders.filter(o => o.payment_method === 'bkash').length;
    
    return [
      { name: t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery'), value: cod, color: 'hsl(var(--chart-1))' },
      { name: t('বিকাশ', 'bKash'), value: bkash, color: '#E2136E' },
    ].filter(d => d.value > 0);
  }, [orders, t]);

  if (data.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-4 md:p-6">
        <h3 className="font-semibold mb-4">{t('পেমেন্ট পদ্ধতি', 'Payment Methods')}</h3>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          {t('ডাটা নেই', 'No data')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <h3 className="font-semibold mb-4">{t('পেমেন্ট পদ্ধতি', 'Payment Methods')}</h3>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-4 mt-2 flex-wrap">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span>{entry.name}: {entry.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderStatusChart({ orders }: DashboardChartsProps) {
  const { t } = useLanguage();

  const data = useMemo(() => {
    const statusCounts = {
      pending: orders.filter(o => o.order_status === 'pending').length,
      confirmed: orders.filter(o => o.order_status === 'confirmed').length,
      shipped: orders.filter(o => o.order_status === 'shipped').length,
      delivered: orders.filter(o => o.order_status === 'delivered').length,
      cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    };

    return [
      { name: t('পেন্ডিং', 'Pending'), value: statusCounts.pending, color: 'hsl(45, 93%, 47%)' },
      { name: t('কনফার্মড', 'Confirmed'), value: statusCounts.confirmed, color: 'hsl(217, 91%, 60%)' },
      { name: t('শিপড', 'Shipped'), value: statusCounts.shipped, color: 'hsl(271, 91%, 65%)' },
      { name: t('ডেলিভার্ড', 'Delivered'), value: statusCounts.delivered, color: 'hsl(142, 76%, 36%)' },
      { name: t('বাতিল', 'Cancelled'), value: statusCounts.cancelled, color: 'hsl(0, 84%, 60%)' },
    ].filter(d => d.value > 0);
  }, [orders, t]);

  if (data.length === 0) {
    return (
      <div className="bg-card border rounded-xl p-4 md:p-6">
        <h3 className="font-semibold mb-4">{t('অর্ডার স্ট্যাটাস', 'Order Status')}</h3>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          {t('ডাটা নেই', 'No data')}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border rounded-xl p-4 md:p-6">
      <h3 className="font-semibold mb-4">{t('অর্ডার স্ট্যাটাস', 'Order Status')}</h3>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-sm flex-1">{item.name}</span>
            <span className="font-medium">{item.value}</span>
            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${(item.value / orders.length) * 100}%`,
                  backgroundColor: item.color 
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
