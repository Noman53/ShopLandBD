import { Link } from 'react-router-dom';
import { ArrowRight, Headphones, MapPin, PackageSearch, RotateCcw, Shield, ShoppingBag, Truck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import SEO from '@/components/SEO';

export default function AboutPage() {
  const { t } = useLanguage();

  const features = [
    {
      icon: ShoppingBag,
      titleBn: 'সহজে পণ্য খুঁজুন',
      titleEn: 'Browse with ease',
      descBn: 'ক্যাটাগরি ও সার্চ ব্যবহার করে উপলভ্য পণ্য দেখুন এবং পণ্যের পেজে দাম ও বিবরণ যাচাই করুন।',
      descEn: 'Browse available products by category or search, then check each product page for its price and details.',
    },
    {
      icon: Truck,
      titleBn: 'ডেলিভারির তথ্য আগে জানুন',
      titleEn: 'Know delivery details',
      descBn: 'ডেলিভারি এলাকা ও চার্জ চেকআউটে ঠিকানা দেওয়ার পর দেখানো হয়।',
      descEn: 'Delivery availability and charges are shown at checkout after you enter your address.',
    },
    {
      icon: Shield,
      titleBn: 'উপলভ্য পেমেন্ট বেছে নিন',
      titleEn: 'Choose an available payment method',
      descBn: 'আপনার অর্ডারের জন্য চেকআউটে দেখানো পেমেন্ট অপশন থেকে বেছে নিন।',
      descEn: 'Choose from the payment options displayed for your order at checkout.',
    },
    {
      icon: Headphones,
      titleBn: 'সহায়তা নিন',
      titleEn: 'Get support',
      descBn: 'সাধারণ প্রশ্নের উত্তর পেতে চ্যাট ব্যবহার করুন, অথবা সরাসরি আমাদের সাথে যোগাযোগ করুন।',
      descEn: 'Use chat for common questions or contact the store team directly.',
    },
  ];

  const steps = [
    {
      icon: ShoppingBag,
      titleBn: 'পণ্য বেছে নিন',
      titleEn: 'Choose a product',
      descriptionBn: 'পণ্যের পেজে মূল্য, বিবরণ ও উপলভ্য অপশন দেখে কার্টে যোগ করুন।',
      descriptionEn: 'Review the price, description, and available options before adding an item to your cart.',
    },
    {
      icon: MapPin,
      titleBn: 'চেকআউটে তথ্য দিন',
      titleEn: 'Enter checkout details',
      descriptionBn: 'ডেলিভারি ঠিকানা দিন এবং আপনার অর্ডারে উপলভ্য পেমেন্ট অপশন দেখুন।',
      descriptionEn: 'Enter your delivery address and review the payment methods available for your order.',
    },
    {
      icon: PackageSearch,
      titleBn: 'অর্ডার ট্র্যাক করুন',
      titleEn: 'Track your order',
      descriptionBn: 'অর্ডার আইডি ও ফোন নম্বর দিয়ে অর্ডারের বর্তমান অবস্থা দেখুন।',
      descriptionEn: 'Use your order ID and phone number to check the latest order status.',
    },
  ];

  return (
    <div className="page-enter min-h-screen bg-background safe-bottom">
      <SEO
        title={t('ShopLandBD সম্পর্কে', 'About ShopLandBD')}
        description="ShopLandBD-তে পণ্য খোঁজা, চেকআউট, পেমেন্ট অপশন, ডেলিভারি তথ্য ও অর্ডার ট্র্যাকিং সম্পর্কে জানুন।"
        canonical="/about"
      />
      <div className="container mx-auto max-w-6xl px-4 py-8 md:py-12">
        <section className="about-hero relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary via-primary to-emerald-950 px-6 py-12 text-primary-foreground shadow-xl md:px-12 md:py-16">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-amber-300/15 blur-3xl" />
          <div className="max-w-3xl">
            <img src="/images/shopland-logo.png" alt="ShopLandBD" className="mb-6 h-14 w-14 rounded-2xl bg-white/95 p-2 object-contain shadow-lg" />
            <p className="mb-3 text-xs font-semibold text-primary-foreground/70">
              {t('বাংলাদেশে অনলাইন শপিং', 'Online shopping in Bangladesh')}
            </p>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl">
              {t('ShopLandBD সম্পর্কে', 'About ShopLandBD')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-primary-foreground/85 md:text-lg">
              {t(
                'ShopLandBD-তে পণ্য খুঁজুন, চেকআউটে অর্ডারের পেমেন্ট ও ডেলিভারির তথ্য দেখুন এবং অর্ডার আইডি দিয়ে অর্ডারের অবস্থা ট্র্যাক করুন।',
                'ShopLandBD helps you browse products, review payment and delivery details at checkout, and track your order using its order ID.'
              )}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild variant="secondary" className="rounded-full font-semibold">
                <Link to="/products">
                  {t('পণ্য দেখুন', 'Browse products')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/5 text-primary-foreground hover:bg-white/15 hover:text-primary-foreground">
                <Link to="/contact">{t('যোগাযোগ করুন', 'Contact us')}</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="scroll-reveal py-12 md:py-16">
          <div className="mb-6 max-w-2xl">
            <p className="text-sm font-semibold text-primary">{t('ShopLandBD-তে', 'Shopping with ShopLandBD')}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              {t('কেনাকাটার দরকারি সুবিধা', 'Useful shopping features')}
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.titleEn} className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg md:p-6">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{t(feature.titleBn, feature.titleEn)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(feature.descBn, feature.descEn)}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="scroll-reveal rounded-3xl border border-border/70 bg-card p-6 shadow-sm md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PackageSearch className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                {t('অর্ডার করার সহজ ধাপ', 'A straightforward way to order')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {t(
                  'পণ্য বাছাই থেকে ডেলিভারি আপডেট দেখা পর্যন্ত, প্রতিটি ধাপে প্রয়োজনীয় তথ্য ও লিংক ব্যবহার করুন।',
                  'Use the available product details, checkout information, and tracking tools at each step.'
                )}
              </p>
            </div>
            <div className="space-y-5">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.titleEn} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{index + 1}. {t(step.titleBn, step.titleEn)}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {t(step.descriptionBn, step.descriptionEn)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="scroll-reveal mt-8 flex flex-col gap-5 rounded-3xl bg-secondary/60 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm font-semibold">{t('রিটার্ন নীতিমালা', 'Returns policy')}</span>
            </div>
            <h2 className="mt-2 text-xl font-bold">
              {t('রিটার্নের শর্ত আগে জেনে নিন', 'Review the return terms')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('যোগ্যতা ও প্রক্রিয়ার বিস্তারিত রিটার্ন পেজে দেখুন।', 'Check the returns page for eligibility and instructions.')}
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0 rounded-full">
            <Link to="/returns">
              {t('রিটার্ন নীতি দেখুন', 'View returns policy')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </div>
  );
}
