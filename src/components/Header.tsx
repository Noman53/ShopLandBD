import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, Home, Package, Heart, Zap, Info, FileText, Phone, LogOut, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveFlashSale } from '@/hooks/useFlashSales';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import LanguageToggle from './LanguageToggle';
import UserAvatar from './UserAvatar';
import SearchAutocomplete from './SearchAutocomplete';
import HeaderDropdown from './header/HeaderDropdown';
import CategoriesDropdown from './header/CategoriesDropdown';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import ShopLogo from './ShopLogo';

interface UserProfile {
  name: string | null;
  avatar_url: string | null;
}

export default function Header() {
  const { t, language } = useLanguage();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { data: activeFlashSale } = useActiveFlashSale();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Fetch user profile for avatar
  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setUserProfile(data);
          }
        });
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Handle search icon click
  const handleSearchIconClick = () => {
    setIsSearchOpen(!isSearchOpen);
  };

  // Check if current path matches
  const isActive = (path: string) => location.pathname === path;

  // Policy dropdown items
  const policyItems = [
    { label: t('গোপনীয়তা নীতি', 'Privacy Policy'), path: '/privacy-policy' },
    { label: t('শর্তাবলী', 'Terms & Conditions'), path: '/terms' },
    { label: t('রিটার্ন পলিসি', 'Returns Policy'), path: '/returns' },
  ];

  return (
    <header className="storefront-header sticky top-0 z-50 border-b shadow-sm">
      <div className="container mx-auto px-4">
        {/* Main Header Row */}
        <div className="flex items-center justify-between h-16 md:h-[4.5rem] lg:h-20 gap-2 md:gap-3 lg:gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center group flex-shrink-0">
            <ShopLogo size="sm" className="md:hidden" />
            <ShopLogo size="md" className="hidden md:flex lg:hidden" />
            <ShopLogo size="lg" className="hidden lg:flex" />
          </Link>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center flex-1 justify-center min-w-0" style={{ gap: 'clamp(0.08rem, 0.7vw, 0.9rem)' }}>
            {[
              { to: '/', label: t('হোম', 'Home') },
              { to: '/products', label: t('সব পণ্য', 'Products') },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
                  isActive(link.to) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent/50"
                )}
                style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
              >
                {link.label}
              </Link>
            ))}

            <CategoriesDropdown isActive={isActive('/categories')} />

            {activeFlashSale && (
              <Link
                to={`/products?flash_sale=${activeFlashSale.id}`}
                className="relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap text-destructive animate-pulse"
                style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
              >
                {t('⚡ সেল', '⚡ Sale')}
              </Link>
            )}

            <HeaderDropdown
              label={t('নীতিমালা', 'Policies')}
              items={policyItems}
              isActive={isActive('/privacy-policy') || isActive('/terms') || isActive('/returns')}
            />

            <Link
              to="/about"
              className={cn(
                "relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
                isActive('/about') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent/50"
              )}
              style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
            >
              {t('সম্পর্কে', 'About')}
            </Link>

            <Link
              to="/contact"
              className={cn(
                "relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-1 whitespace-nowrap",
                isActive('/contact') ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-accent/50"
              )}
              style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
            >
              {t('যোগাযোগ', 'Contact')}
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5 md:gap-1 lg:gap-1.5 shrink-0">
            {/* Desktop Search - Collapsible */}
            <div className="hidden md:flex items-center">
              {isSearchOpen ? (
                <SearchAutocomplete onClose={() => setIsSearchOpen(false)} />
              ) : (
                <Button variant="ghost" size="icon" onClick={handleSearchIconClick} className="hover:bg-accent/50 h-8 w-8 lg:h-10 lg:w-10">
                  <Search className="w-4 h-4 lg:w-5 lg:h-5" />
                </Button>
              )}
            </div>

            {/* Mobile Search Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleSearchIconClick}
              className="md:hidden hover:bg-accent/50"
            >
              <Search className="w-5 h-5" />
            </Button>

            <div className="md:scale-90 lg:scale-100 origin-center"><LanguageToggle /></div>

            <Link to="/wishlist" className="relative hidden sm:block">
              <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 h-8 w-8 lg:h-10 lg:w-10">
                <Heart className={cn("w-4 h-4 lg:w-5 lg:h-5", wishlistCount > 0 && "text-pink-500")} />
              </Button>
            </Link>

            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="relative hover:bg-accent/50 h-8 w-8 lg:h-10 lg:w-10">
                <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5 shadow-sm">
                    {itemCount > 99 ? '99+' : itemCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* User Icon with Hover Dropdown */}
            <div className="hidden sm:block relative group"
              onMouseLeave={() => {/* group-hover handles this */}}
            >
              {user && userProfile ? (
                <button className="cursor-pointer">
                  <UserAvatar
                    name={userProfile.name}
                    avatarUrl={userProfile.avatar_url}
                    size="sm"
                    showTooltip={false}
                  />
                </button>
              ) : (
                <Link to="/login">
                  <Button variant="ghost" size="icon" className="hover:bg-accent/50 h-8 w-8 lg:h-10 lg:w-10">
                    <User className="w-4 h-4 lg:w-5 lg:h-5" />
                  </Button>
                </Link>
              )}
              {user && userProfile && (
                <div className="user-avatar-dropdown absolute right-0 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[100]">
                  <div className="bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[180px]">
                    <div className="px-4 py-3 border-b border-border">
                      <p className="font-semibold text-sm text-foreground truncate">{userProfile.name || t('ব্যবহারকারী', 'User')}</p>
                    </div>
                    <div className="py-1.5">
                      <Link
                        to="/account"
                        onClick={() => {
                          const dd = document.querySelector('.user-avatar-dropdown') as HTMLElement;
                          if (dd) {
                            dd.style.opacity = '0';
                            dd.style.visibility = 'hidden';
                            setTimeout(() => {
                              dd.style.removeProperty('opacity');
                              dd.style.removeProperty('visibility');
                            }, 300);
                          }
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4 text-muted-foreground" />
                        {t('ড্যাশবোর্ড', 'Dashboard')}
                      </Link>
                      <button
                        onClick={async () => {
                          await supabase.auth.signOut();
                          navigate('/');
                        }}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        {t('লগআউট', 'Logout')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu */}
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="hover:bg-accent/50">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0">
                <SheetHeader className="p-6 pb-4 border-b">
                  <SheetTitle>
                    <ShopLogo size="sm" />
                  </SheetTitle>
                </SheetHeader>
                
                <nav className="flex flex-col p-4 gap-1 overflow-y-auto max-h-[calc(100vh-100px)]">
                  <Link to="/" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors", isActive('/') ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                    <Home className="w-5 h-5" />
                    {t('হোম', 'Home')}
                  </Link>
                  <Link to="/products" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors", isActive('/products') ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                    <Package className="w-5 h-5" />
                    {t('সব পণ্য', 'All Products')}
                  </Link>
                  <Link to="/categories" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors", isActive('/categories') ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                    <Package className="w-5 h-5" />
                    {t('ক্যাটাগরি', 'Categories')}
                  </Link>

                  {activeFlashSale && (
                    <Link to={`/products?flash_sale=${activeFlashSale.id}`} onClick={() => setIsSheetOpen(false)} className="flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors text-red-500">
                      <Zap className="w-5 h-5" />
                      {t('⚡ ফ্ল্যাশ সেল', '⚡ Flash Sale')}
                    </Link>
                  )}
                  
                  <div className="h-px bg-border my-3" />
                  <p className="px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('নীতিমালা', 'Policies')}</p>
                  {policyItems.map(item => (
                    <Link key={item.path} to={item.path} onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors", isActive(item.path) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                      <FileText className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}

                  <div className="h-px bg-border my-3" />
                  <Link to="/about" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors", isActive('/about') ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                    <Info className="w-5 h-5" />
                    {t('আমাদের সম্পর্কে', 'About Us')}
                  </Link>
                  <Link to="/contact" onClick={() => setIsSheetOpen(false)} className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors", isActive('/contact') ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/50")}>
                    <Phone className="w-5 h-5" />
                    {t('যোগাযোগ', 'Contact Us')}
                  </Link>

                  <div className="h-px bg-border my-3" />
                  <Link
                    to={user ? "/account" : "/login"}
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      (isActive('/login') || isActive('/account'))
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <User className={cn("w-5 h-5", user && "text-primary")} />
                    {user ? t('ড্যাশবোর্ড', 'Dashboard') : t('অ্যাকাউন্ট', 'Account')}
                  </Link>
                  
                  <Link
                    to="/cart"
                    onClick={() => setIsSheetOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      isActive('/cart')
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/50"
                    )}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {t('কার্ট', 'Cart')}
                    {itemCount > 0 && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar - Show when search is open */}
        {isSearchOpen && (
          <div className="md:hidden pb-3">
            <SearchAutocomplete isMobile onClose={() => setIsSearchOpen(false)} />
          </div>
        )}
      </div>
    </header>
  );
}
