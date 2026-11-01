import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Facebook, Instagram, Youtube, CreditCard, Truck, Shield, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ShopLogo from './ShopLogo';

export default function Footer() {
  const { t, language } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card/60 backdrop-blur-xl border-t border-border/50 mt-auto supports-[backdrop-filter]:bg-card/60">
      {/* Features Bar - Responsive Grid */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-xs md:text-sm">{t('দ্রুত ডেলিভারি', 'Fast Delivery')}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t('সারাদেশে', 'Nationwide')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-xs md:text-sm">{t('নিরাপদ পেমেন্ট', 'Secure Payment')}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t('বিকাশ ও COD', 'bKash & COD')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-xs md:text-sm">{t('নিশ্চিত মান', 'Quality Assured')}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t('১০০% অরিজিনাল', '100% Original')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-xs md:text-sm">{t('২৪/৭ সাপোর্ট', '24/7 Support')}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">{t('যেকোনো সময়', 'Anytime')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer - Responsive Layout */}
      <div className="container mx-auto px-4 py-6 md:py-12">
        {/* Mobile: 2 column, Tablet+: 4 column */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {/* Brand - Full width on mobile, single col on md+ */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="mb-3 md:mb-4 inline-block">
              <ShopLogo size="sm" className="md:hidden" />
              <ShopLogo size="md" className="hidden md:flex" />
            </Link>
            <p className="text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 line-clamp-2 md:line-clamp-none">
              {t('বাংলাদেশের সেরা অনলাইন শপিং প্ল্যাটফর্ম।', 'Bangladesh\'s premier online shopping platform.')}
            </p>
            <div className="flex gap-2 md:gap-3">
              <a href="#" className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Facebook className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </a>
              <a href="#" className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Instagram className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </a>
              <a href="#" className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Youtube className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-sm md:text-base mb-2 md:mb-4">{t('দ্রুত লিংক', 'Quick Links')}</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link to="/products" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('সব পণ্য', 'All Products')}
                </Link>
              </li>
              <li>
                <Link to="/categories" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('ক্যাটাগরি', 'Categories')}
                </Link>
              </li>
              <li>
                <Link to="/account" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('অ্যাকাউন্ট', 'My Account')}
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('অর্ডার ট্র্যাক', 'Track Order')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-bold text-sm md:text-base mb-2 md:mb-4">{t('নীতিমালা', 'Policies')}</h3>
            <ul className="space-y-1.5 md:space-y-2">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('প্রাইভেসি', 'Privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('শর্তাবলী', 'Terms')}
                </Link>
              </li>
              <li>
                <Link to="/returns" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('রিটার্ন', 'Returns')}
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-primary text-xs md:text-sm transition-colors">
                  {t('যোগাযোগ', 'Contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-sm md:text-base mb-2 md:mb-4">{t('যোগাযোগ', 'Contact Us')}</h3>
            <ul className="space-y-2 md:space-y-3">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <a href="tel:+8801521486023" className="text-muted-foreground text-xs md:text-sm hover:text-primary transition-colors">
                  +880 1521-486023
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <a href="mailto:shoplanbd2@gmail.com" className="text-muted-foreground text-xs md:text-sm hover:text-primary transition-colors">
                  shoplanbd2@gmail.com
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground text-xs md:text-sm">
                  {t('ঢাকা, বাংলাদেশ', 'Dhaka, Bangladesh')}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <p className="text-xs md:text-sm text-muted-foreground text-center">
            © {currentYear} ShopLandBD
          </p>
        </div>
      </div>
    </footer>
  );
}