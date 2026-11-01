import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, LogIn, UserPlus, LogOut, History, ChevronRight, Loader2, Heart, MapPin, Phone, Mail, Settings, Clock, CheckCircle, XCircle, Truck, CreditCard, Edit2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatPrice, formatDate } from '@/lib/formatters';
import ProfileEditModal from '@/components/ProfileEditModal';
import OrderDetailsModal from '@/components/OrderDetailsModal';
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
interface Profile {
  name: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  email: string | null;
  avatar_url?: string | null;
}
export default function AccountPage() {
  const {
    t,
    language
  } = useLanguage();
  const {
    user,
    loading,
    signOut
  } = useAuth();
  const {
    itemCount: wishlistCount
  } = useWishlist();
  const {
    data: isAdmin
  } = useIsAdmin();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0
  });
  useEffect(() => {
    if (user) {
      fetchOrders();
      fetchProfile();
    }
  }, [user]);

  // Avoid calling navigate during render (can cause blank screens / inconsistent taps on mobile)
  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', {
        replace: true
      });
    }
  }, [loading, user, navigate]);
  const fetchProfile = async () => {
    setProfileLoading(true);
    const {
      data,
      error
    } = await supabase.from('profiles').select('name, phone, address, city, email, avatar_url').eq('user_id', user?.id).maybeSingle();
    if (!error && data) {
      setProfile(data);
    }
    setProfileLoading(false);
  };
  const fetchOrders = async () => {
    setOrdersLoading(true);
    const {
      data,
      error
    } = await supabase.from('orders').select(`
        id, 
        created_at, 
        total,
        subtotal,
        order_status, 
        payment_status,
        payment_method,
        customer_name,
        customer_phone,
        customer_address,
        customer_city,
        notes,
        order_items (
          id,
          product_id,
          product_name_bn,
          product_name_en,
          quantity,
          price,
          products (
            images
          )
        )
      `).eq('user_id', user?.id).order('created_at', {
      ascending: false
    });
    if (!error && data) {
      // Transform data to flatten products
      const transformedOrders = data.map(order => ({
        ...order,
        order_items: order.order_items?.map((item: any) => ({
          ...item,
          product: item.products
        }))
      }));
      setOrders(transformedOrders);
      setStats({
        totalOrders: data.length,
        pendingOrders: data.filter(o => o.order_status === 'pending' || o.order_status === 'confirmed').length,
        completedOrders: data.filter(o => o.order_status === 'delivered').length
      });
    }
    setOrdersLoading(false);
  };
  const handleSignOut = async () => {
    await signOut();
    toast.success(t('সফলভাবে লগআউট হয়েছে', 'Logged out successfully'));
    navigate('/');
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-secondary text-secondary-foreground';
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
      case 'pending':
        return t('পেন্ডিং', 'Pending');
      case 'confirmed':
        return t('কনফার্মড', 'Confirmed');
      case 'shipped':
        return t('শিপড', 'Shipped');
      case 'delivered':
        return t('ডেলিভার্ড', 'Delivered');
      case 'cancelled':
        return t('বাতিল', 'Cancelled');
      default:
        return status;
    }
  };
  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return t('পেন্ডিং', 'Pending');
      case 'paid':
        return t('পেইড', 'Paid');
      case 'verified':
        return t('ভেরিফাইড', 'Verified');
      case 'rejected':
        return t('রিজেক্টেড', 'Rejected');
      default:
        return status;
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };
  const handleStatClick = (filter: string) => {
    // Navigate to orders with filter
    if (filter === 'total') {
      // Show all orders - could implement a filter in future
    } else if (filter === 'pending') {
      // Filter pending orders
    } else if (filter === 'completed') {
      // Filter completed orders
    } else if (filter === 'wishlist') {
      navigate('/wishlist');
    }
  };
  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
    setIsOrderDetailsOpen(true);
  };
  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }

  // Redirecting in effect above; keep UI stable while redirect happens.
  if (!user) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>;
  }

  // Show logged-in user view
  return <div className="min-h-screen bg-background safe-bottom pb-24">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {t('আমার অ্যাকাউন্ট', 'My Account')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('আপনার অর্ডার এবং প্রোফাইল ম্যানেজ করুন', 'Manage your orders and profile')}
            </p>
          </div>
          {/* Top Right Actions */}
          <div className="flex items-center gap-2">
            {isAdmin && <Link to="/admin">
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" />
                  {t('অ্যাডমিন প্যানেল', 'Admin Panel')}
                </Button>
              </Link>}
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4" />
              {t('লগআউট', 'Log Out')}
            </Button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile */}
          <div className="lg:col-span-1 space-y-6">
            {/* User Info Card */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center border-4 border-background shadow-lg mb-3 overflow-hidden">
                    {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover object-center" /> : <User className="w-10 h-10 text-primary" />}
                  </div>
                  <h2 className="text-xl font-bold">
                    {profile?.name || user.email?.split('@')[0] || t('ব্যবহারকারী', 'User')}
                  </h2>
                  
                  <span className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium mt-2">
                    {t('সদস্য', 'Member')}
                  </span>
                </div>
              </div>
              
              {/* Profile Details */}
              {profileLoading ? <CardContent className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-10" />
                    <Skeleton className="h-10" />
                  </div>
                </CardContent> : <CardContent className="p-4 space-y-3">
                  {profile?.phone && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{profile.phone}</span>
                    </div>}
                  {profile?.email && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{profile.email}</span>
                    </div>}
                  {(profile?.address || profile?.city) && <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{[profile?.address, profile?.city].filter(Boolean).join(', ')}</span>
                    </div>}
                  <Button variant="outline" className="w-full mt-3" onClick={() => setIsProfileEditOpen(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    {t('প্রোফাইল সম্পাদনা', 'Edit Profile')}
                  </Button>
                </CardContent>}
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('total')}>
                <CardContent className="p-4 text-center">
                  <Package className="w-6 h-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalOrders}</p>
                  <p className="text-xs text-blue-600/80 dark:text-blue-400/80">{t('মোট অর্ডার', 'Total Orders')}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border-yellow-200/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('pending')}>
                <CardContent className="p-4 text-center">
                  <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{stats.pendingOrders}</p>
                  <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80">{t('চলমান', 'In Progress')}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-green-200/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('completed')}>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completedOrders}</p>
                  <p className="text-xs text-green-600/80 dark:text-green-400/80">{t('সম্পন্ন', 'Completed')}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-pink-50 to-pink-100/50 dark:from-pink-950/30 dark:to-pink-900/20 border-pink-200/50 cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleStatClick('wishlist')}>
                <CardContent className="p-4 text-center">
                  <Heart className="w-6 h-6 mx-auto mb-2 text-pink-600 dark:text-pink-400" />
                  <p className="text-2xl font-bold text-pink-700 dark:text-pink-300">{wishlistCount}</p>
                  <p className="text-xs text-pink-600/80 dark:text-pink-400/80">{t('পছন্দ', 'Wishlist')}</p>
                </CardContent>
              </Card>
            </div>

          </div>

          {/* Right Column - Orders */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <History className="w-5 h-5" />
                  {t('অর্ডার হিস্ট্রি', 'Order History')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
                  </div> : orders.length > 0 ? <div className="space-y-3">
                    {orders.map(order => <div key={order.id} onClick={() => handleOrderClick(order)} className="p-4 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer">
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${getStatusColor(order.order_status)}`}>
                              {getStatusIcon(order.order_status)}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {t('অর্ডার', 'Order')} #{order.id.slice(0, 8).toUpperCase()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(order.created_at, language)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.order_status)}`}>
                              {getStatusText(order.order_status)}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getPaymentStatusColor(order.payment_status)}`}>
                              {getPaymentStatusText(order.payment_status)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Order Items Preview */}
                        {order.order_items && order.order_items.length > 0 && <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
                            {order.order_items.slice(0, 4).map(item => <div key={item.id} className="flex-shrink-0 w-12 h-12 rounded-lg bg-secondary overflow-hidden" title={language === 'bn' ? item.product_name_bn : item.product_name_en}>
                                {item.product?.images && item.product.images[0] ? <img src={item.product.images[0]} alt={language === 'bn' ? item.product_name_bn : item.product_name_en} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                    <Package className="w-5 h-5" />
                                  </div>}
                              </div>)}
                            {order.order_items.length > 4 && <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                                +{order.order_items.length - 4}
                              </div>}
                          </div>}
                        
                        {/* Order Footer */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <CreditCard className="w-3 h-3" />
                            {order.payment_method === 'bkash' ? 'bKash' : t('ক্যাশ অন ডেলিভারি', 'COD')}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary">
                              {formatPrice(Number(order.total), language)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>)}
                  </div> : <div className="text-center py-12">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">
                      {t('এখনো কোনো অর্ডার নেই', 'No orders yet')}
                    </p>
                    <Link to="/products">
                      <Button>
                        {t('শপিং শুরু করুন', 'Start Shopping')}
                      </Button>
                    </Link>
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen} profile={profile} onProfileUpdate={fetchProfile} />

      {/* Order Details Modal */}
      <OrderDetailsModal open={isOrderDetailsOpen} onOpenChange={open => {
      setIsOrderDetailsOpen(open);
      if (!open) setSelectedOrder(null);
    }} order={selectedOrder} />
    </div>;
}