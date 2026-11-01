import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ShoppingBag, Truck, Shield, HeadphonesIcon, Target, Eye, Heart, Users, Award, TrendingUp } from 'lucide-react';
import SEO from '@/components/SEO';

export default function AboutPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: ShoppingBag,
      titleBn: 'বিশাল পণ্য সংগ্রহ',
      titleEn: 'Wide Product Range',
      descBn: 'আমাদের কাছে বিভিন্ন ক্যাটাগরির সেরা পণ্য পাবেন সবচেয়ে ভালো দামে।',
      descEn: 'Find the best products across various categories at the most competitive prices.',
    },
    {
      icon: Truck,
      titleBn: 'দ্রুত ডেলিভারি',
      titleEn: 'Fast Delivery',
      descBn: 'সারাদেশে দ্রুত এবং নিরাপদ ডেলিভারি সেবা।',
      descEn: 'Fast and secure delivery service across the country.',
    },
    {
      icon: Shield,
      titleBn: 'নিরাপদ পেমেন্ট',
      titleEn: 'Secure Payment',
      descBn: 'ক্যাশ অন ডেলিভারি এবং বিকাশ পেমেন্ট সুবিধা।',
      descEn: 'Cash on delivery and bKash payment options available.',
    },
    {
      icon: HeadphonesIcon,
      titleBn: '২৪/৭ সাপোর্ট',
      titleEn: '24/7 Support',
      descBn: 'আমাদের কাস্টমার সার্ভিস টিম সবসময় আপনার পাশে আছে।',
      descEn: 'Our customer service team is always here to help you.',
    },
  ];

  const stats = [
    { valueBn: '১০,০০০+', valueEn: '10,000+', labelBn: 'সন্তুষ্ট গ্রাহক', labelEn: 'Happy Customers', icon: Users },
    { valueBn: '৫,০০০+', valueEn: '5,000+', labelBn: 'পণ্য সংগ্রহ', labelEn: 'Products', icon: ShoppingBag },
    { valueBn: '৬৪', valueEn: '64', labelBn: 'জেলায় ডেলিভারি', labelEn: 'Districts Covered', icon: Truck },
    { valueBn: '৯৮%', valueEn: '98%', labelBn: 'সন্তুষ্টির হার', labelEn: 'Satisfaction Rate', icon: Award },
  ];

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <SEO
        title={t('ShopLandBD সম্পর্কে', 'About ShopLandBD')}
        description="ShopLandBD সম্পর্কে জানুন — বাংলাদেশের বিশ্বস্ত অনলাইন শপিং প্ল্যাটফর্ম।"
        canonical="/about"
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero */}
        <div className="text-center mb-12">
          <img src="/images/shopland-logo.png" alt="ShopLandBD" className="w-16 h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold mb-4">
            {t('ShopLandBD সম্পর্কে', 'About ShopLandBD')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t(
              'ShopLandBD হলো বাংলাদেশের একটি বিশ্বস্ত অনলাইন শপিং প্ল্যাটফর্ম। আমরা সেরা মানের পণ্য সেরা দামে আপনার দোরগোড়ায় পৌঁছে দিচ্ছি।',
              'ShopLandBD is a trusted online shopping platform in Bangladesh. We deliver the best quality products at the best prices right to your doorstep.'
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="bg-card border rounded-xl p-4 text-center">
                <Icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-primary">{t(stat.valueBn, stat.valueEn)}</p>
                <p className="text-xs text-muted-foreground">{t(stat.labelBn, stat.labelEn)}</p>
              </div>
            );
          })}
        </div>

        {/* Our Story */}
        <div className="bg-card border rounded-xl p-6 md:p-8 mb-8">
          <h2 className="text-xl font-bold mb-4">{t('আমাদের গল্প', 'Our Story')}</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              {t(
                'ShopLandBD-এর যাত্রা শুরু হয়েছিল একটি সহজ বিশ্বাস থেকে — মানসম্পন্ন পণ্য সবার জন্য সহজলভ্য হওয়া উচিত। বাংলাদেশের প্রতিটি কোণে নির্ভরযোগ্য অনলাইন শপিং সুবিধা পৌঁছে দেওয়াই আমাদের লক্ষ্য। আমরা সরাসরি বিশ্বস্ত সরবরাহকারীদের কাছ থেকে পণ্য সংগ্রহ করি, যাতে আপনি সবসময় সেরা মান ও সেরা দাম পান।',
                'ShopLandBD started with a simple belief — quality products should be accessible to everyone. Our goal is to bring reliable online shopping to every corner of Bangladesh. We source products directly from trusted suppliers, ensuring you always get the best quality at the best price.'
              )}
            </p>
            <p>
              {t(
                'আমাদের দক্ষ টিম প্রতিটি পণ্য যত্নসহকারে বাছাই করে এবং নিশ্চিত করে যে প্যাকেজিং থেকে ডেলিভারি — সবকিছু যেন নিখুঁত হয়। গ্রাহকদের সন্তুষ্টিই আমাদের সবচেয়ে বড় পুরস্কার।',
                'Our expert team carefully selects every product and ensures everything from packaging to delivery is flawless. Customer satisfaction is our greatest reward.'
              )}
            </p>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-card border rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('আমাদের মিশন', 'Our Mission')}</h3>
            <p className="text-sm text-muted-foreground">
              {t(
                'বাংলাদেশের প্রতিটি মানুষের কাছে সেরা মানের পণ্য সহজে, দ্রুত এবং সুলভ মূল্যে পৌঁছে দেওয়া। গ্রাহকদের বিশ্বাস ও সন্তুষ্টি অর্জনই আমাদের প্রধান লক্ষ্য।',
                'To deliver the best quality products to every person in Bangladesh easily, quickly, and at affordable prices. Earning customer trust and satisfaction is our primary goal.'
              )}
            </p>
          </div>
          <div className="bg-card border rounded-xl p-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{t('আমাদের ভিশন', 'Our Vision')}</h3>
            <p className="text-sm text-muted-foreground">
              {t(
                'বাংলাদেশের সবচেয়ে বিশ্বস্ত এবং গ্রাহক-বান্ধব ই-কমার্স প্ল্যাটফর্ম হিসেবে নিজেদের প্রতিষ্ঠিত করা, যেখানে প্রতিটি গ্রাহক নিরাপদে এবং আনন্দের সাথে কেনাকাটা করতে পারবে।',
                'To establish ourselves as the most trusted and customer-friendly e-commerce platform in Bangladesh, where every customer can shop safely and joyfully.'
              )}
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-card border rounded-xl p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{t(feature.titleBn, feature.titleEn)}</h3>
                  <p className="text-sm text-muted-foreground">{t(feature.descBn, feature.descEn)}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Customer Promise */}
        <div className="bg-card border rounded-xl p-6 md:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-3">{t('গ্রাহকদের প্রতি আমাদের প্রতিশ্রুতি', 'Our Promise to Customers')}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✅ {t('১০০% অরিজিনাল পণ্যের গ্যারান্টি', '100% original product guarantee')}</li>
                <li>✅ {t('সহজ রিটার্ন ও রিফান্ড পলিসি', 'Easy return and refund policy')}</li>
                <li>✅ {t('সারাদেশে দ্রুত ও নিরাপদ ডেলিভারি', 'Fast and secure delivery nationwide')}</li>
                <li>✅ {t('সর্বোচ্চ গ্রাহক সেবা ও সাপোর্ট', 'Best customer service and support')}</li>
                <li>✅ {t('প্রতিযোগিতামূলক ও ন্যায্য মূল্য', 'Competitive and fair pricing')}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary text-primary-foreground rounded-xl p-6 md:p-8 text-center">
          <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-90" />
          <h2 className="text-xl font-bold mb-3">{t('আজই শপিং শুরু করুন!', 'Start Shopping Today!')}</h2>
          <p className="text-primary-foreground/90 max-w-xl mx-auto text-sm">
            {t(
              'ShopLandBD-তে হাজার হাজার পণ্য, আকর্ষণীয় অফার এবং দ্রুত ডেলিভারি সুবিধা উপভোগ করুন। আমরা আপনার কেনাকাটার অভিজ্ঞতা আরও সহজ ও আনন্দদায়ক করতে প্রতিশ্রুতিবদ্ধ।',
              'Enjoy thousands of products, attractive offers, and fast delivery on ShopLandBD. We are committed to making your shopping experience easier and more enjoyable.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
