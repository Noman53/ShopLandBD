import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid3X3, ShoppingCart, User, Heart, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveFlashSale } from '@/hooks/useFlashSales';
import { supabase } from '@/integrations/supabase/client';
import UserAvatar from './UserAvatar';
import { cn } from '@/lib/utils';

interface UserProfile {
  name: string | null;
  avatar_url: string | null;
}

export default function BottomNav() {
  const location = useLocation();
  const { t } = useLanguage();
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { data: activeFlashSale } = useActiveFlashSale();
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

  const navItems = [
    {
      path: '/',
      icon: Home,
      label_bn: 'হোম',
      label_en: 'Home',
    },
    ...(activeFlashSale ? [{
      path: `/products?flash_sale=${activeFlashSale.id}`,
      icon: Zap,
      label_bn: 'ফ্ল্যাশ',
      label_en: 'Flash',
      isFlashSale: true,
    }] : [{
      path: '/categories',
      icon: Grid3X3,
      label_bn: 'ক্যাটাগরি',
      label_en: 'Categories',
    }]),
    {
      path: '/wishlist',
      icon: Heart,
      label_bn: 'পছন্দ',
      label_en: 'Wishlist',
    },
    {
      path: '/cart',
      icon: ShoppingCart,
      label_bn: 'কার্ট',
      label_en: 'Cart',
      badge: itemCount,
    },
    {
      // Navigate based on auth state
      path: user ? '/account' : '/login',
      icon: User,
      label_bn: user ? 'ড্যাশবোর্ড' : 'অ্যাকাউন্ট',
      label_en: user ? 'Dashboard' : 'Account',
      isActive: user ? true : false,
    },
  ];

  return (
    <nav className="bottom-nav md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path || 
            (item.path.includes('flash_sale') && location.search.includes('flash_sale'));
          const Icon = item.icon;
          const isUserItem = item.path.includes('account') || item.path.includes('login');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "bottom-nav-item relative",
                isActive && "active",
                (item as any).isFlashSale && "text-red-500"
              )}
            >
              <div className="relative flex items-center justify-center w-6 h-6">
                {isUserItem && user && userProfile ? (
                  <UserAvatar
                    name={userProfile.name}
                    avatarUrl={userProfile.avatar_url}
                    size="sm"
                    showTooltip={false}
                    className="w-6 h-6"
                  />
                ) : (
                  <Icon className={cn(
                    "w-[22px] h-[22px]",
                    item.path === '/wishlist' && isActive && "fill-current",
                    (item as any).isFlashSale && "animate-pulse"
                  )} />
                )}
                {(item as any).badge != null && (item as any).badge > 0 && (
                  <span className="cart-badge">{(item as any).badge}</span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 font-medium leading-tight">
                {t(item.label_bn, item.label_en)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
