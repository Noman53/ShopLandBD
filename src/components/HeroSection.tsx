import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Truck, Shield, Headphones, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { useHeroSlides } from '@/hooks/useHeroSlides';
import { cn } from '@/lib/utils';

export default function HeroSection() {
  const { t } = useLanguage();
  const { data: slides, isLoading } = useHeroSlides();
  const [current, setCurrent] = useState(0);
  const [mobileAspectRatio, setMobileAspectRatio] = useState(3);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const activeSlides = useMemo(() => slides?.filter(s => s.is_active) ?? [], [slides]);
  const hasSlides = activeSlides.length > 0;
  const slideCount = activeSlides.length;

  // Continuous auto-play
  useEffect(() => {
    if (slideCount <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slideCount);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slideCount]);

  // Reset index if slides change
  useEffect(() => {
    if (slideCount > 0 && current >= slideCount) setCurrent(0);
  }, [slideCount, current]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setCurrent(prev => (prev + 1) % slideCount), 5000);
  }, [slideCount]);

  const goPrev = useCallback(() => {
    setCurrent(prev => (prev - 1 + slideCount) % slideCount);
    resetTimer();
  }, [slideCount, resetTimer]);

  const goNext = useCallback(() => {
    setCurrent(prev => (prev + 1) % slideCount);
    resetTimer();
  }, [slideCount, resetTimer]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || slideCount <= 1) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  }, [slideCount, goNext, goPrev]);

  return (
    <section className="relative overflow-hidden">
      {/* Main Hero — fixed 3:1 aspect ratio on all devices */}
      <div
        className="store-hero relative min-h-[15rem] text-primary-foreground group aspect-[var(--hero-mobile-ar)] sm:min-h-0 sm:aspect-[3/1]"
        style={{ ['--hero-mobile-ar' as string]: `${mobileAspectRatio}` } as React.CSSProperties}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background layers */}
        {isLoading ? (
          <div className="absolute inset-0 bg-muted" />
        ) : hasSlides ? (
          <div className="absolute inset-0">
            {activeSlides.map((slide, i) => {
              const isActive = i === current;
              return (
                <div
                  key={slide.id}
                  className="absolute inset-0"
                  style={{
                    opacity: isActive ? 1 : 0,
                    zIndex: isActive ? 1 : 0,
                    transition: 'opacity 1s cubic-bezier(0.4, 0, 0.2, 1)',
                    willChange: 'opacity',
                  }}
                  aria-hidden={!isActive}
                >
                  <img
                    src={slide.image_url}
                    alt=""
                    className={cn(
                      "absolute inset-0 w-full h-full object-contain sm:object-cover object-center",
                      isActive && "hero-slide-active"
                    )}
                    loading={isActive ? 'eager' : 'lazy'}
                    fetchPriority={isActive ? 'high' : 'low'}
                    decoding={isActive ? 'sync' : 'async'}
                    onLoad={(event) => {
                      const image = event.currentTarget;
                      if (isActive && image.naturalWidth && image.naturalHeight) {
                        setMobileAspectRatio(image.naturalWidth / image.naturalHeight);
                      }
                    }}
                    draggable={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/35 to-black/15" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 hero-gradient" />
        )}

        {/* Content overlay — flex centered, responsive text with no cutoff */}
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="store-hero-content max-w-[74%] sm:max-w-xl lg:max-w-2xl space-y-2.5 sm:space-y-4 md:space-y-5">
              <p className="hidden sm:inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                {t('বাংলাদেশে অনলাইন শপিং', 'Everyday shopping, made easier')}
              </p>
              <h1 className="text-[clamp(1rem,5vw,1.5rem)] sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold leading-[1.25] sm:leading-[1.15] tracking-tight drop-shadow-lg">
                {t(
                  'আপনার অনলাইন কেনাকাটা শুরু হোক',
                  'Find your next favorite'
                )}
              </h1>
              <p className="max-w-xl text-[clamp(0.72rem,2.8vw,0.95rem)] sm:text-sm md:text-base lg:text-lg text-white/90 drop-shadow-md leading-[1.4] sm:leading-[1.5]">
                {t(
                  'পণ্য ব্রাউজ করুন, চেকআউটে পেমেন্ট ও ডেলিভারির তথ্য দেখুন',
                  'Browse products and review payment and delivery details at checkout'
                )}
              </p>
              <div className="flex flex-nowrap gap-1.5 sm:gap-3 pt-1 sm:pt-1">
                <Link to="/products">
                  <Button size="lg" variant="secondary" className="font-semibold whitespace-nowrap text-xs sm:text-sm h-10 px-3 sm:px-5 md:px-6 rounded-xl shadow-lg shadow-black/10">
                    {t('শপিং শুরু করুন', 'Start Shopping')}
                    <ArrowRight className="w-2.5 h-2.5 sm:w-4 sm:h-4 ml-0.5 sm:ml-1" />
                  </Button>
                </Link>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-primary-foreground border border-primary-foreground/35 bg-white/5 hover:bg-primary-foreground/15 hover:text-primary-foreground whitespace-nowrap text-xs sm:text-sm h-10 px-3 sm:px-5 md:px-6 rounded-xl backdrop-blur-sm"
                  onClick={() => window.location.href = '/categories'}
                >
                  {t('ক্যাটাগরি দেখুন', 'Browse Categories')}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        {slideCount > 1 && (
          <>
            <button
              onClick={goPrev}
              className={cn(
                "absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20",
                "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full",
                "bg-black/25 backdrop-blur-md text-primary-foreground",
                "flex items-center justify-center",
                "hover:bg-black/45 transition-all duration-300 ease-in-out",
                "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                "translate-x-2 group-hover:translate-x-0"
              )}
              aria-label="Previous slide"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={goNext}
              className={cn(
                "absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-20",
                "w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full",
                "bg-black/25 backdrop-blur-md text-primary-foreground",
                "flex items-center justify-center",
                "hover:bg-black/45 transition-all duration-300 ease-in-out",
                "opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto",
                "-translate-x-2 group-hover:translate-x-0"
              )}
              aria-label="Next slide"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Dot indicators */}
        {slideCount > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 sm:gap-2">
            {activeSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  'h-1.5 sm:h-2 rounded-full transition-all duration-500',
                  i === current ? 'w-6 sm:w-8 bg-primary-foreground' : 'w-1.5 sm:w-2 bg-primary-foreground/50 hover:bg-primary-foreground/70'
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Decorative Elements (only when no slides) */}
        {!hasSlides && (
          <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary-foreground" />
            <div className="absolute bottom-10 right-32 w-20 h-20 rounded-full bg-primary-foreground" />
          </div>
        )}
      </div>

      {/* Features Strip */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-8">
            <div className="flex flex-col md:flex-row items-center gap-1.5 sm:gap-2 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium">
                  {t('ডেলিভারির তথ্য', 'Delivery Details')}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {t('সারাদেশে', 'Nationwide')}
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-1.5 sm:gap-2 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium">
                  {t('নিরাপদ পেমেন্ট', 'Secure Payment')}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {t('চেকআউটে দেখুন', 'Shown at checkout')}
                </p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-1.5 sm:gap-2 md:gap-3 text-center md:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium">
                  {t('কাস্টমার সহায়তা', 'Customer Support')}
                </p>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground hidden sm:block">
                  {t('চ্যাট ও যোগাযোগ', 'Chat and contact')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}