import React, { useState, useMemo } from 'react';
import { Users, Search, Mail, Phone, MapPin, ShoppingBag, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDate } from '@/lib/formatters';

interface CustomerData {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  created_at: string;
  total_orders: number;
  total_spent: number;
}

export default function AdminCustomers() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: async () => {
      // Get all orders grouped by user_id with totals
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id, total, customer_name, customer_phone, customer_email, customer_city, customer_address, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Group by user_id
      const customerMap = new Map<string, CustomerData>();
      orders?.forEach(order => {
        if (!order.user_id) return;
        const existing = customerMap.get(order.user_id);
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += Number(order.total);
        } else {
          customerMap.set(order.user_id, {
            user_id: order.user_id,
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            city: order.customer_city,
            address: order.customer_address,
            created_at: order.created_at,
            total_orders: 1,
            total_spent: Number(order.total),
          });
        }
      });

      // Also get guest orders (no user_id) grouped by phone
      const { data: guestOrders } = await supabase
        .from('orders')
        .select('customer_name, customer_phone, customer_email, customer_city, customer_address, total, created_at')
        .is('user_id', null);

      const guestMap = new Map<string, CustomerData>();
      guestOrders?.forEach(order => {
        const key = order.customer_phone;
        const existing = guestMap.get(key);
        if (existing) {
          existing.total_orders += 1;
          existing.total_spent += Number(order.total);
        } else {
          guestMap.set(key, {
            user_id: `guest-${key}`,
            name: order.customer_name,
            email: order.customer_email,
            phone: order.customer_phone,
            city: order.customer_city,
            address: order.customer_address,
            created_at: order.created_at,
            total_orders: 1,
            total_spent: Number(order.total),
          });
        }
      });

      return [...customerMap.values(), ...guestMap.values()].sort((a, b) => b.total_spent - a.total_spent);
    },
  });

  const filtered = useMemo(() => {
    if (!customers) return [];
    if (!searchQuery) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  }, [customers, searchQuery]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">{t('গ্রাহক ম্যানেজমেন্ট', 'Customer Management')}</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} {t('জন গ্রাহক', 'customers')}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('নাম, ফোন, ইমেইল...', 'Name, phone, email...')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="text-left p-4 text-sm font-medium">{t('গ্রাহক', 'Customer')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('যোগাযোগ', 'Contact')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অবস্থান', 'Location')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অর্ডার', 'Orders')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('মোট খরচ', 'Total Spent')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">{t('কোন গ্রাহক নেই', 'No customers found')}</td></tr>
                ) : filtered.map(customer => (
                  <tr key={customer.user_id} className="hover:bg-secondary/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{customer.name?.[0]?.toUpperCase() || '?'}</span>
                        </div>
                        <div>
                          <p className="font-medium">{customer.name || t('অজানা', 'Unknown')}</p>
                          {customer.user_id.startsWith('guest-') && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded">{t('গেস্ট', 'Guest')}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {customer.email && <p className="text-sm flex items-center gap-1"><Mail className="w-3 h-3" />{customer.email}</p>}
                      {customer.phone && <p className="text-sm flex items-center gap-1"><Phone className="w-3 h-3" />{customer.phone}</p>}
                    </td>
                    <td className="p-4">
                      {customer.city && <p className="text-sm flex items-center gap-1"><MapPin className="w-3 h-3" />{customer.city}</p>}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1 font-medium">
                        <ShoppingBag className="w-4 h-4 text-muted-foreground" />
                        {customer.total_orders}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-primary">{formatPrice(customer.total_spent, language)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
