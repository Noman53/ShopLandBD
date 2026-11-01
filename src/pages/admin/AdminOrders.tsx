import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Check, X, Truck, Package, Download, FileText, Calendar, Filter, StickyNote, RefreshCw, CheckSquare, Square, FileSpreadsheet, FileDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdminOrders, useUpdateOrderStatus, useStoreSettings } from '@/hooks/useAdmin';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/exportUtils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { formatPrice, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'react-router-dom';
import { escapeHtml } from '@/lib/sanitize';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string;
  customer_city: string;
  total: number;
  subtotal: number;
  payment_method: string;
  payment_status: string;
  order_status: string;
  bkash_sender_number: string | null;
  bkash_transaction_id: string | null;
  bkash_paid_amount: number | null;
  admin_notes: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    product_id: string | null;
    product_name_bn: string;
    product_name_en: string;
    quantity: number;
    price: number;
  }>;
}

interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

export default function AdminOrders() {
  const { t, language } = useLanguage();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: orders, isLoading, refetch } = useAdminOrders();
  const { data: storeSettings } = useStoreSettings();
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [paymentFilter, setPaymentFilter] = useState(searchParams.get('payment') || 'all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkStatusAction, setBulkStatusAction] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const priceDisplay = (amount: number) => formatPrice(amount, language);

  // Handle URL date filter
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const dateValue = new Date(dateParam);
      if (!isNaN(dateValue.getTime())) {
        setDateRange({ from: dateValue, to: dateValue });
      }
    }
  }, [searchParams]);

  const orderStatuses = [
    { value: 'pending', labelBn: 'পেন্ডিং', labelEn: 'Pending' },
    { value: 'confirmed', labelBn: 'কনফার্মড', labelEn: 'Confirmed' },
    { value: 'shipped', labelBn: 'শিপড', labelEn: 'Shipped' },
    { value: 'delivered', labelBn: 'ডেলিভার্ড', labelEn: 'Delivered' },
    { value: 'cancelled', labelBn: 'বাতিল', labelEn: 'Cancelled' },
  ];

  const paymentStatuses = [
    { value: 'pending', labelBn: 'পেন্ডিং', labelEn: 'Pending' },
    { value: 'verified', labelBn: 'ভেরিফাইড', labelEn: 'Verified' },
    { value: 'paid', labelBn: 'পেইড', labelEn: 'Paid' },
    { value: 'failed', labelBn: 'ব্যর্থ', labelEn: 'Failed' },
  ];

  // Manually handle real-time updates more reliably
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        () => {
          // Delay refetch slightly to ensure order_items are created
          setTimeout(() => {
            refetch();
          }, 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const updateAdminNotes = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ admin_notes: notes })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success(t('নোট সেভ হয়েছে', 'Notes saved'));
    },
  });

  // Restore stock when order is cancelled (variant-aware)
  const restoreStock = async (orderItems: Order['order_items']) => {
    for (const item of orderItems) {
      if (!item.product_id) continue;

      // Check if this product uses variants
      const { data: product } = await supabase
        .from('products')
        .select('id, stock_quantity, is_wearable, has_color_variants')
        .eq('id', item.product_id)
        .single();

      if (!product) continue;

      const hasVariants = product.is_wearable || product.has_color_variants;

      if (hasVariants) {
        // Restore stock to product_sizes variants (spread evenly starting from first available)
        const { data: variants } = await supabase
          .from('product_sizes')
          .select('id, stock_quantity, is_available')
          .eq('product_id', item.product_id)
          .eq('is_available', true)
          .order('size_order', { ascending: true });

        if (variants && variants.length > 0) {
          // Restore to the first available variant
          const firstVariant = variants[0];
          await supabase
            .from('product_sizes')
            .update({ stock_quantity: firstVariant.stock_quantity + item.quantity })
            .eq('id', firstVariant.id);
        }
      } else {
        // Non-variant: restore to base product stock
        await supabase
          .from('products')
          .update({ stock_quantity: product.stock_quantity + item.quantity })
          .eq('id', item.product_id);
      }
    }
    // Invalidate products cache
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['variant-stock'] });
  };

  const getStatusBadge = (status: string, type: 'order' | 'payment') => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      verified: 'bg-green-100 text-green-800',
      paid: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const labels = type === 'order' ? orderStatuses : paymentStatuses;
    const label = labels.find(s => s.value === status);

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {t(label?.labelBn || status, label?.labelEn || status)}
      </span>
    );
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return;

    try {
      // If cancelling order, restore stock
      if (newStatus === 'cancelled' && order.order_status !== 'cancelled') {
        await restoreStock(order.order_items as Order['order_items']);
        toast.success(t('স্টক পুনরুদ্ধার হয়েছে', 'Stock restored'));
      }

      // Determine payment status based on order status and payment method
      let paymentStatus = order.payment_status;
      if (newStatus === 'delivered') {
        // COD orders become paid on delivery
        if (order.payment_method === 'cod') {
          paymentStatus = 'paid';
        }
      } else if (newStatus === 'cancelled') {
        paymentStatus = 'failed';
      }

      await updateStatus.mutateAsync({ 
        orderId, 
        orderStatus: newStatus,
        paymentStatus: paymentStatus !== order.payment_status ? paymentStatus : undefined
      });
      
      toast.success(t('স্ট্যাটাস আপডেট হয়েছে', 'Status updated'));
      
      // Update selected order if viewing
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ 
          ...selectedOrder, 
          order_status: newStatus,
          payment_status: paymentStatus
        });
      }
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleUpdatePaymentStatus = async (orderId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ orderId, paymentStatus: status });
      toast.success(t('পেমেন্ট স্ট্যাটাস আপডেট হয়েছে', 'Payment status updated'));
      
      // Update selected order if viewing
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: status });
      }
    } catch (error) {
      toast.error(t('ত্রুটি হয়েছে', 'Error occurred'));
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedOrder) return;
    await updateAdminNotes.mutateAsync({ orderId: selectedOrder.id, notes: adminNotes });
    setSelectedOrder({ ...selectedOrder, admin_notes: adminNotes });
  };

  // Bulk selection handlers
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedOrders.size === 0) {
      toast.error(t('অর্ডার সিলেক্ট করুন', 'Select orders first'));
      return;
    }

    setIsBulkUpdating(true);
    let successCount = 0;
    let errorCount = 0;

    for (const orderId of selectedOrders) {
      try {
        const order = orders?.find(o => o.id === orderId);
        if (!order) continue;

        // Handle stock restoration for cancellations
        if (newStatus === 'cancelled' && order.order_status !== 'cancelled') {
          await restoreStock(order.order_items as Order['order_items']);
        }

        // Determine payment status
        let paymentStatus = order.payment_status;
        if (newStatus === 'delivered' && order.payment_method === 'cod') {
          paymentStatus = 'paid';
        } else if (newStatus === 'cancelled') {
          paymentStatus = 'failed';
        }

        await updateStatus.mutateAsync({
          orderId,
          orderStatus: newStatus,
          paymentStatus: paymentStatus !== order.payment_status ? paymentStatus : undefined
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsBulkUpdating(false);
    setSelectedOrders(new Set());

    if (successCount > 0) {
      toast.success(t(
        `${successCount}টি অর্ডার আপডেট হয়েছে`,
        `${successCount} orders updated`
      ));
    }
    if (errorCount > 0) {
      toast.error(t(
        `${errorCount}টি অর্ডার আপডেট ব্যর্থ`,
        `${errorCount} orders failed to update`
      ));
    }
  };

  const generateInvoicePDF = (order: Order) => {
    const settings = storeSettings || {};
    const storeName = settings.store_name || 'ShopLandBD';
    const storePhone = settings.store_phone || '';
    const storeEmail = settings.store_email || '';
    const storeAddress = settings.store_address || '';
    const storeLogo = settings.store_logo || '';

    const subtotal = Number(order.subtotal);
    const total = Number(order.total);
    const deliveryFee = total - subtotal;
    const invoiceDate = format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a');
    const invoiceNo = order.id.slice(0, 8).toUpperCase();

    const invoiceContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice #${invoiceNo}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1f2937; background: #fff; }
    .invoice-wrapper { max-width: 800px; margin: 0 auto; padding: 40px; }
    
    /* Header */
    .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 24px; border-bottom: 3px solid #10b981; margin-bottom: 32px; }
    .shop-info h1 { font-size: 28px; font-weight: 800; color: #10b981; margin-bottom: 4px; }
    .shop-info p { font-size: 13px; color: #6b7280; line-height: 1.6; }
    .invoice-meta { text-align: right; }
    .invoice-meta .invoice-label { font-size: 24px; font-weight: 700; color: #111827; text-transform: uppercase; letter-spacing: 2px; }
    .invoice-meta .invoice-number { font-size: 14px; color: #10b981; font-weight: 600; margin-top: 4px; }
    .invoice-meta .invoice-date { font-size: 13px; color: #6b7280; margin-top: 2px; }
    
    /* Info Grid */
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .info-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
    .info-card h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; font-weight: 700; margin-bottom: 12px; }
    .info-card p { font-size: 14px; line-height: 1.7; color: #374151; }
    .info-card .name { font-weight: 700; font-size: 15px; color: #111827; }
    
    /* Table */
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .items-table thead th { background: #111827; color: #fff; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
    .items-table thead th:first-child { border-radius: 6px 0 0 0; }
    .items-table thead th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    .items-table thead th.qty, .items-table thead th.price { text-align: center; }
    .items-table tbody td { padding: 14px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .items-table tbody td.qty, .items-table tbody td.price { text-align: center; }
    .items-table tbody td.amount { text-align: right; font-weight: 600; }
    .items-table tbody tr:last-child td { border-bottom: 2px solid #e5e7eb; }
    .item-index { color: #9ca3af; font-size: 12px; margin-right: 8px; }
    
    /* Totals */
    .totals-section { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; color: #374151; }
    .totals-row.subtotal { border-bottom: 1px solid #e5e7eb; }
    .totals-row.delivery { }
    .totals-row.grand-total { border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-size: 18px; font-weight: 800; color: #111827; }
    
    /* Payment Box */
    .payment-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 32px; }
    .payment-box h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #16a34a; font-weight: 700; margin-bottom: 8px; }
    .payment-box p { font-size: 13px; color: #374151; line-height: 1.6; }
    .payment-box .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-paid { background: #dcfce7; color: #166534; }
    .badge-pending { background: #fef9c3; color: #854d0e; }
    .badge-verified { background: #dcfce7; color: #166534; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    
    /* Footer */
    .invoice-footer { border-top: 1px solid #e5e7eb; padding-top: 24px; text-align: center; }
    .invoice-footer .thank-you { font-size: 16px; font-weight: 600; color: #10b981; margin-bottom: 4px; }
    .invoice-footer .note { font-size: 12px; color: #9ca3af; }
    
    /* Order Status */
    .status-bar { display: flex; justify-content: space-between; align-items: center; background: #f3f4f6; border-radius: 6px; padding: 10px 16px; margin-bottom: 24px; font-size: 13px; }
    .status-bar .status-label { color: #6b7280; }
    .status-bar .status-value { font-weight: 700; text-transform: capitalize; }
    
     @media print {
      body { padding: 0; }
      .invoice-wrapper { padding: 20px; }
    }
    @page { size: A4; margin: 10mm; }
    html, body { height: auto; }
    .invoice-wrapper { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <div class="invoice-header">
      <div class="shop-info">
        ${storeLogo ? `<img src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeName)}" style="max-height:50px;width:auto;margin-bottom:8px;" />` : ''}
        <h1>${escapeHtml(storeName)}</h1>
        ${storeAddress ? `<p>${escapeHtml(storeAddress)}</p>` : ''}
        ${storePhone ? `<p>Phone: ${escapeHtml(storePhone)}</p>` : ''}
        ${storeEmail ? `<p>Email: ${escapeHtml(storeEmail)}</p>` : ''}
      </div>
      <div class="invoice-meta">
        <div class="invoice-label">Invoice</div>
        <div class="invoice-number">#${escapeHtml(invoiceNo)}</div>
        <div class="invoice-date">${escapeHtml(invoiceDate)}</div>
      </div>
    </div>

    <div class="status-bar">
      <span><span class="status-label">Order Status:</span> <span class="status-value">${escapeHtml(order.order_status)}</span></span>
      <span><span class="status-label">Payment:</span> <span class="status-value">${escapeHtml(order.payment_status)}</span></span>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <h3>Bill To</h3>
        <p class="name">${escapeHtml(order.customer_name)}</p>
        <p>${escapeHtml(order.customer_phone)}</p>
        ${order.customer_email ? `<p>${escapeHtml(order.customer_email)}</p>` : ''}
        <p>${escapeHtml(order.customer_address)}</p>
        <p>${escapeHtml(order.customer_city)}</p>
      </div>
      <div class="info-card">
        <h3>Order Details</h3>
        <p><strong>Order ID:</strong> #${escapeHtml(invoiceNo)}</p>
        <p><strong>Date:</strong> ${escapeHtml(invoiceDate)}</p>
        <p><strong>Payment Method:</strong> ${order.payment_method === 'bkash' ? 'bKash' : 'Cash on Delivery'}</p>
        <p><strong>Items:</strong> ${order.order_items.length} product(s)</p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th style="width:50%">Product</th>
          <th class="qty">Qty</th>
          <th class="price">Unit Price</th>
          <th style="text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${order.order_items.map((item, i) => `
          <tr>
            <td><span class="item-index">${i + 1}.</span> ${escapeHtml(language === 'bn' ? item.product_name_bn : item.product_name_en)}</td>
            <td class="qty">${item.quantity}</td>
            <td class="price">৳${Number(item.price).toLocaleString()}</td>
            <td class="amount">৳${(Number(item.price) * item.quantity).toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-section">
      <div class="totals-box">
        <div class="totals-row subtotal">
          <span>Subtotal</span>
          <span>৳${subtotal.toLocaleString()}</span>
        </div>
        <div class="totals-row delivery">
          <span>Delivery Fee</span>
          <span>${deliveryFee > 0 ? `৳${deliveryFee.toLocaleString()}` : 'Free'}</span>
        </div>
        <div class="totals-row grand-total">
          <span>Total</span>
          <span>৳${total.toLocaleString()}</span>
        </div>
      </div>
    </div>

    ${order.payment_method === 'bkash' ? `
    <div class="payment-box">
      <h3>bKash Payment Details</h3>
      ${order.bkash_sender_number ? `<p><strong>Sender Number:</strong> ${escapeHtml(order.bkash_sender_number)}</p>` : ''}
      ${order.bkash_transaction_id ? `<p><strong>Transaction ID:</strong> ${escapeHtml(order.bkash_transaction_id)}</p>` : ''}
      ${order.bkash_paid_amount ? `<p><strong>Paid Amount:</strong> ৳${Number(order.bkash_paid_amount).toLocaleString()}</p>` : ''}
      <p><strong>Status:</strong> <span class="badge badge-${order.payment_status}">${order.payment_status}</span></p>
    </div>
    ` : ''}

    <div class="invoice-footer">
      <p class="thank-you">Thank you for shopping with ${escapeHtml(storeName)}!</p>
      <p class="note">This is a computer-generated invoice. No signature required.</p>
    </div>
  </div>
</body>
</html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.order_status !== statusFilter) return false;
      
      // Payment filter
      if (paymentFilter !== 'all') {
        if (paymentFilter === 'bkash_pending') {
          if (!(order.payment_method === 'bkash' && order.payment_status === 'pending')) return false;
        } else if (order.payment_method !== paymentFilter) {
          return false;
        }
      }

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const orderDate = new Date(order.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(orderDate, { start: startOfDay(dateRange.from), end: endOfDay(dateRange.to) })) {
            return false;
          }
        } else if (dateRange.from && orderDate < startOfDay(dateRange.from)) {
          return false;
        } else if (dateRange.to && orderDate > endOfDay(dateRange.to)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesName = order.customer_name.toLowerCase().includes(query);
        const matchesPhone = order.customer_phone.includes(query);
        if (!matchesId && !matchesName && !matchesPhone) return false;
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, dateRange, searchQuery]);

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateRange({ from: undefined, to: undefined });
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || dateRange.from || dateRange.to || searchQuery;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('অর্ডার সমূহ', 'Orders')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('সব অর্ডার দেখুন এবং ম্যানেজ করুন', 'View and manage all orders')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Actions */}
            {selectedOrders.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="default" size="sm" disabled={isBulkUpdating}>
                    {isBulkUpdating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckSquare className="w-4 h-4 mr-2" />
                    )}
                    {t('বাল্ক অ্যাকশন', 'Bulk Actions')} ({selectedOrders.size})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('confirmed')}>
                    <Check className="w-4 h-4 mr-2 text-blue-500" />
                    {t('কনফার্ম করুন', 'Mark Confirmed')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('shipped')}>
                    <Truck className="w-4 h-4 mr-2 text-purple-500" />
                    {t('শিপড করুন', 'Mark Shipped')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkStatusUpdate('delivered')}>
                    <Package className="w-4 h-4 mr-2 text-green-500" />
                    {t('ডেলিভার্ড করুন', 'Mark Delivered')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => handleBulkStatusUpdate('cancelled')}
                    className="text-destructive focus:text-destructive"
                  >
                    <X className="w-4 h-4 mr-2" />
                    {t('বাতিল করুন', 'Cancel Orders')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FileDown className="w-4 h-4 mr-2" />
                  {t('এক্সপোর্ট', 'Export')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToCSV(filteredOrders as any, `orders-${format(new Date(), 'yyyy-MM-dd')}`)}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToExcel(filteredOrders as any, `orders-${format(new Date(), 'yyyy-MM-dd')}`)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToPDF(filteredOrders as any, `orders-${format(new Date(), 'yyyy-MM-dd')}`, storeSettings)}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('রিফ্রেশ', 'Refresh')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(hasActiveFilters && 'border-primary text-primary')}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('ফিল্টার', 'Filters')}
              {hasActiveFilters && (
                <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-card border rounded-xl p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('অনুসন্ধান', 'Search')}
                </Label>
                <Input
                  placeholder={t('আইডি, নাম, ফোন...', 'ID, name, phone...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Order Status */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('অর্ডার স্ট্যাটাস', 'Order Status')}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('সব স্ট্যাটাস', 'All Status')}</SelectItem>
                    {orderStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {t(status.labelBn, status.labelEn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('পেমেন্ট', 'Payment')}
                </Label>
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('সব পেমেন্ট', 'All Payments')}</SelectItem>
                    <SelectItem value="cod">{t('ক্যাশ অন ডেলিভারি', 'Cash on Delivery')}</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="bkash_pending">{t('বিকাশ ভেরিফিকেশন', 'bKash Pending')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {t('তারিখ', 'Date Range')}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <Calendar className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'LLL dd')} - {format(dateRange.to, 'LLL dd')}
                          </>
                        ) : (
                          format(dateRange.from, 'LLL dd, yyyy')
                        )
                      ) : (
                        <span className="text-muted-foreground">{t('তারিখ বাছাই', 'Pick dates')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={(range) => setDateRange(range || { from: undefined, to: undefined })}
                      numberOfMonths={2}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex justify-between items-center pt-2 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredOrders.length} {t('টি অর্ডার', 'orders found')}
                </p>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  {t('ফিল্টার ক্লিয়ার', 'Clear Filters')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50">
                <tr>
                  <th className="w-12 p-4">
                    <Checkbox
                      checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium">{t('অর্ডার', 'Order')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('গ্রাহক', 'Customer')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('মোট', 'Total')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('পেমেন্ট', 'Payment')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('স্ট্যাটাস', 'Status')}</th>
                  <th className="text-left p-4 text-sm font-medium">{t('অ্যাকশন', 'Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      {t('কোন অর্ডার নেই', 'No orders found')}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className={cn(
                      "hover:bg-secondary/30",
                      selectedOrders.has(order.id) && "bg-primary/5"
                    )}>
                      <td className="p-4">
                        <Checkbox
                          checked={selectedOrders.has(order.id)}
                          onCheckedChange={() => toggleOrderSelection(order.id)}
                        />
                      </td>
                      <td className="p-4">
                        <p className="font-mono text-sm font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at, language)}
                        </p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{order.customer_name}</p>
                        <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{priceDisplay(Number(order.total))}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.payment_method === 'bkash' ? 'bKash' : 'COD'}
                        </p>
                      </td>
                      <td className="p-4">{getStatusBadge(order.payment_status, 'payment')}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(order.order_status, 'order')}
                          {order.admin_notes && (
                            <StickyNote className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order as unknown as Order);
                              setAdminNotes(order.admin_notes || '');
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => generateInvoicePDF(order as unknown as Order)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('অর্ডার বিস্তারিত', 'Order Details')} #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {t('অর্ডার তথ্য এবং স্ট্যাটাস আপডেট করুন', 'View order details and update status')}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">{t('গ্রাহক তথ্য', 'Customer Info')}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('নাম', 'Name')}</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('ফোন', 'Phone')}</p>
                    <p className="font-medium">{selectedOrder.customer_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">{t('ঠিকানা', 'Address')}</p>
                    <p className="font-medium">{selectedOrder.customer_address}, {selectedOrder.customer_city}</p>
                  </div>
                </div>
              </div>

              {/* bKash Info */}
              {selectedOrder.payment_method === 'bkash' && (
                <div className="bg-bkash/10 border border-bkash/30 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 text-bkash">
                    {t('বিকাশ পেমেন্ট তথ্য', 'bKash Payment Info')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t('প্রেরকের নম্বর', 'Sender Number')}</p>
                      <p className="font-medium font-mono">{selectedOrder.bkash_sender_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('ট্রানজেকশন আইডি', 'Transaction ID')}</p>
                      <p className="font-medium font-mono">{selectedOrder.bkash_transaction_id || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('পেইড অ্যামাউন্ট', 'Paid Amount')}</p>
                      <p className="font-medium">{selectedOrder.bkash_paid_amount ? priceDisplay(selectedOrder.bkash_paid_amount) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{t('স্ট্যাটাস', 'Status')}</p>
                      {getStatusBadge(selectedOrder.payment_status, 'payment')}
                    </div>
                  </div>

                  {selectedOrder.payment_status === 'pending' && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'verified')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {t('ভেরিফাই করুন', 'Verify Payment')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdatePaymentStatus(selectedOrder.id, 'failed')}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('রিজেক্ট করুন', 'Reject')}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* COD Payment Status Note */}
              {selectedOrder.payment_method === 'cod' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    <strong>{t('ক্যাশ অন ডেলিভারি:', 'Cash on Delivery:')}</strong> {' '}
                    {selectedOrder.order_status === 'delivered' 
                      ? t('পণ্য ডেলিভার হয়েছে - পেমেন্ট সংগ্রহ করা হয়েছে', 'Product delivered - Payment collected')
                      : t('পণ্য ডেলিভারের সময় পেমেন্ট সংগ্রহ করা হবে', 'Payment will be collected upon delivery')
                    }
                  </p>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-3">{t('অর্ডার আইটেম', 'Order Items')}</h3>
                <div className="space-y-2">
                  {selectedOrder.order_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-secondary/30 rounded-lg">
                      <div>
                        <p className="font-medium">
                          {language === 'bn' ? item.product_name_bn : item.product_name_en}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {priceDisplay(Number(item.price))} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">{priceDisplay(Number(item.price) * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between font-bold text-lg">
                  <span>{t('মোট', 'Total')}</span>
                  <span className="text-primary">{priceDisplay(Number(selectedOrder.total))}</span>
                </div>
              </div>

              {/* Admin Notes */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <Label className="flex items-center gap-2 mb-2">
                  <StickyNote className="w-4 h-4" />
                  {t('অ্যাডমিন নোট', 'Admin Notes')}
                </Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t('অভ্যন্তরীণ নোট লিখুন...', 'Write internal notes...')}
                  rows={3}
                  className="bg-background"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={handleSaveNotes}
                  disabled={updateAdminNotes.isPending}
                >
                  {t('নোট সেভ', 'Save Notes')}
                </Button>
              </div>

              {/* Update Status */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">
                    {t('অর্ডার স্ট্যাটাস', 'Order Status')}
                  </label>
                  <Select
                    value={selectedOrder.order_status}
                    onValueChange={(value) => handleUpdateOrderStatus(selectedOrder.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {t(status.labelBn, status.labelEn)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  onClick={() => generateInvoicePDF(selectedOrder)}
                  className="md:self-end"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('ইনভয়েস ডাউনলোড', 'Download Invoice')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
