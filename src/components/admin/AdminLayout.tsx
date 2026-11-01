import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  FolderTree,
  Ticket,
  Search,
  ChevronDown,
  Zap,
  Globe,
  Trash2,
  MessageSquare,
  Users,
  Truck,
  Bell,
  MoreVertical,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useAdmin';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin', icon: LayoutDashboard, labelBn: 'ড্যাশবোর্ড', labelEn: 'Dashboard' },
  { path: '/admin/orders', icon: ShoppingCart, labelBn: 'অর্ডার সমূহ', labelEn: 'Orders', notifyKey: 'orders' as const },
  { path: '/admin/products', icon: Package, labelBn: 'পণ্য সমূহ', labelEn: 'Products', notifyKey: 'lowStock' as const },
  { path: '/admin/categories', icon: FolderTree, labelBn: 'ক্যাটাগরি', labelEn: 'Categories' },
  { path: '/admin/customers', icon: Users, labelBn: 'গ্রাহক', labelEn: 'Customers' },
  { path: '/admin/coupons', icon: Ticket, labelBn: 'কুপন', labelEn: 'Coupons' },
  { path: '/admin/flash-sales', icon: Zap, labelBn: 'ফ্ল্যাশ সেল', labelEn: 'Flash Sales' },
  { path: '/admin/free-delivery', icon: Truck, labelBn: 'ফ্রি ডেলিভারি', labelEn: 'Free Delivery' },
  { path: '/admin/reviews', icon: MessageSquare, labelBn: 'রিভিউ', labelEn: 'Reviews', notifyKey: 'reviews' as const },
  { path: '/admin/qa', icon: HelpCircle, labelBn: 'প্রশ্ন-উত্তর', labelEn: 'Q&A' },
  { path: '/admin/chat', icon: MessageSquare, labelBn: 'লাইভ চ্যাট', labelEn: 'Live Chat' },
  { path: '/admin/hero-slides', icon: Globe, labelBn: 'হিরো স্লাইডার', labelEn: 'Hero Slider' },
  { path: '/admin/analytics', icon: BarChart3, labelBn: 'বিশ্লেষণ', labelEn: 'Analytics' },
  { path: '/admin/recycle-bin', icon: Trash2, labelBn: 'রিসাইকেল বিন', labelEn: 'Recycle Bin' },
  { path: '/admin/settings', icon: Settings, labelBn: 'সেটিংস', labelEn: 'Settings' },
];

const breadcrumbMap: Record<string, { bn: string; en: string }> = {
  '/admin': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  '/admin/orders': { bn: 'অর্ডার সমূহ', en: 'Orders' },
  '/admin/products': { bn: 'পণ্য সমূহ', en: 'Products' },
  '/admin/categories': { bn: 'ক্যাটাগরি', en: 'Categories' },
  '/admin/customers': { bn: 'গ্রাহক', en: 'Customers' },
  '/admin/coupons': { bn: 'কুপন', en: 'Coupons' },
  '/admin/flash-sales': { bn: 'ফ্ল্যাশ সেল', en: 'Flash Sales' },
  '/admin/free-delivery': { bn: 'ফ্রি ডেলিভারি', en: 'Free Delivery' },
  '/admin/reviews': { bn: 'রিভিউ', en: 'Reviews' },
  '/admin/qa': { bn: 'প্রশ্ন-উত্তর', en: 'Q&A' },
  '/admin/chat': { bn: 'লাইভ চ্যাট', en: 'Live Chat' },
  '/admin/hero-slides': { bn: 'হিরো স্লাইডার', en: 'Hero Slider' },
  '/admin/analytics': { bn: 'বিশ্লেষণ', en: 'Analytics' },
  '/admin/recycle-bin': { bn: 'রিসাইকেল বিন', en: 'Recycle Bin' },
  '/admin/settings': { bn: 'সেটিংস', en: 'Settings' },
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { t, language, setLanguage } = useLanguage();
  const { signOut, loading: authLoading, user } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { newOrderCount, newReviewCount, lowStockCount, markOrdersSeen, markReviewsSeen, markLowStockSeen, markAllAsRead } = useAdminNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    return saved === 'true';
  });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Mark notifications as seen when visiting relevant pages
  useEffect(() => {
    if (location.pathname === '/admin/orders') {
      markOrdersSeen();
    } else if (location.pathname === '/admin/reviews') {
      markReviewsSeen();
    }
  }, [location.pathname, markOrdersSeen, markReviewsSeen]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // Navigate to appropriate section based on search
    const query = searchQuery.toLowerCase();
    if (query.includes('order') || query.includes('অর্ডার')) {
      navigate('/admin/orders');
    } else if (query.includes('product') || query.includes('পণ্য')) {
      navigate('/admin/products');
    } else if (query.includes('coupon') || query.includes('কুপন')) {
      navigate('/admin/coupons');
    } else if (query.includes('category') || query.includes('ক্যাটাগরি')) {
      navigate('/admin/categories');
    }
    setSearchQuery('');
  };

  const getBreadcrumbs = () => {
    const crumbs = [{ path: '/admin', label: breadcrumbMap['/admin'] }];
    if (location.pathname !== '/admin') {
      const pageInfo = breadcrumbMap[location.pathname];
      if (pageInfo) {
        crumbs.push({ path: location.pathname, label: pageInfo });
      }
    }
    return crumbs;
  };

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">{t('লোড হচ্ছে...', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            {t('অ্যাক্সেস নেই', 'Access Denied')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('আপনার এই পেজে অ্যাক্সেস নেই। শুধুমাত্র অ্যাডমিনরা এই এরিয়াতে প্রবেশ করতে পারেন।', 
              'You do not have access to this page. Only administrators can access this area.')}
          </p>
          <Link to="/">
            <Button>
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('হোম পেজে যান', 'Go to Home')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen flex">
      <SEO
        title={language === 'bn'
          ? breadcrumbMap[location.pathname]?.bn || 'অ্যাডমিন'
          : breadcrumbMap[location.pathname]?.en || 'Admin'}
        noindex
      />
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border rounded-lg shadow-lg hover:bg-secondary transition-colors"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'admin-sidebar fixed md:sticky top-0 inset-y-0 left-0 z-40 bg-card border-r flex flex-col h-screen transform transition-all duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'h-16 border-b flex items-center',
          sidebarCollapsed ? 'justify-center px-2' : 'px-6'
        )}>
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-md">
              S
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg">{t('অ্যাডমিন', 'Admin')}</span>
            )}
          </Link>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const notifyCount = item.notifyKey === 'orders' ? newOrderCount
              : item.notifyKey === 'reviews' ? newReviewCount
              : item.notifyKey === 'lowStock' ? lowStockCount
              : 0;
            const markFn = item.notifyKey === 'orders' ? markOrdersSeen
              : item.notifyKey === 'reviews' ? markReviewsSeen
              : item.notifyKey === 'lowStock' ? markLowStockSeen
              : null;

            const NavLink = (
              <Link
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative flex-1 min-w-0',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'hover:bg-secondary text-muted-foreground hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-2'
                )}
              >
                <div className="relative flex-shrink-0">
                  <item.icon className={cn('w-5 h-5', isActive && 'drop-shadow-sm')} />
                  {notifyCount > 0 && sidebarCollapsed && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifyCount > 9 ? '9+' : notifyCount}
                    </span>
                  )}
                </div>
                {!sidebarCollapsed && (
                  <span className="font-medium flex-1 truncate">{t(item.labelBn, item.labelEn)}</span>
                )}
                {!sidebarCollapsed && notifyCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 min-w-5 flex items-center justify-center">
                    {notifyCount > 99 ? '99+' : notifyCount}
                  </Badge>
                )}
              </Link>
            );

            // Wrap with 3-dot menu for sections with notifications
            const NavItem = !sidebarCollapsed && notifyCount > 0 && markFn ? (
              <div key={item.path} className="flex items-center gap-0.5">
                {NavLink}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); markFn(); }}>
                      <Bell className="w-4 h-4 mr-2" />
                      {t('সব পঠিত করুন', 'Mark all as read')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div key={item.path}>{NavLink}</div>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="relative">
                      {NavLink}
                      {notifyCount > 0 && markFn && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="absolute -right-1 -bottom-1 w-4 h-4 rounded-full bg-muted flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right">
                            <DropdownMenuItem onClick={() => markFn()}>
                              <Bell className="w-4 h-4 mr-2" />
                              {t('সব পঠিত করুন', 'Mark all as read')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {t(item.labelBn, item.labelEn)}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return NavItem;
          })}
        </nav>

        {/* Footer */}
        <div className={cn('border-t p-3', sidebarCollapsed && 'flex flex-col items-center')}>
          {sidebarCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link
                    to="/"
                    className="flex items-center justify-center p-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground mb-1"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{t('স্টোরে ফিরুন', 'Back to Store')}</TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center p-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">{t('লগআউট', 'Logout')}</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Link
                to="/"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground mb-1"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>{t('স্টোরে ফিরুন', 'Back to Store')}</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors w-full"
              >
                <LogOut className="w-5 h-5" />
                <span>{t('লগআউট', 'Logout')}</span>
              </button>
            </>
          )}
        </div>

        {/* Collapse Toggle - Desktop Only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border shadow-sm items-center justify-center hover:bg-secondary transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-h-screen flex flex-col">
        {/* Top Bar */}
        <header className="admin-topbar h-16 bg-card border-b flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          {/* Left: Breadcrumbs (desktop) */}
          <div className="hidden md:block">
            <Breadcrumb>
              <BreadcrumbList>
                {getBreadcrumbs().map((crumb, idx, arr) => (
                  <React.Fragment key={crumb.path}>
                    <BreadcrumbItem>
                      {idx === arr.length - 1 ? (
                        <BreadcrumbPage className="font-medium">
                          {language === 'bn' ? crumb.label.bn : crumb.label.en}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.path} className="text-muted-foreground hover:text-foreground">
                            {language === 'bn' ? crumb.label.bn : crumb.label.en}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {idx < arr.length - 1 && <BreadcrumbSeparator />}
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Mobile title */}
          <div className="md:hidden ml-12">
            <h1 className="font-semibold">
              {t(
                breadcrumbMap[location.pathname]?.bn || 'অ্যাডমিন',
                breadcrumbMap[location.pathname]?.en || 'Admin'
              )}
            </h1>
          </div>

          {/* Right: Search, Language & User */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Global Search */}
            <form onSubmit={handleSearch} className="hidden md:block relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('অনুসন্ধান করুন...', 'Search...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64 bg-secondary/50 border-0 focus-visible:bg-background"
              />
            </form>

            {/* Language Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
              className="flex items-center gap-1.5"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{language === 'bn' ? 'EN' : 'বাং'}</span>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user?.email?.[0].toUpperCase() || 'A'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    {t('স্টোরে ফিরুন', 'Back to Store')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('লগআউট', 'Logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <div className="admin-page-content flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
