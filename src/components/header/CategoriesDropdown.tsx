import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Grid3X3, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCategories } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';

interface CategoriesDropdownProps {
  isActive?: boolean;
}

export default function CategoriesDropdown({ isActive }: CategoriesDropdownProps) {
  const { t, language } = useLanguage();
  const { data: categories, isLoading } = useCategories();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          "relative px-1 md:px-1.5 lg:px-3 xl:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-colors flex items-center gap-1 whitespace-nowrap",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
        style={{ fontSize: 'clamp(0.7rem, 1.1vw, 0.935rem)' }}
      >
        {t('ক্যাটাগরি', 'Categories')}
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 min-w-[240px] bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-[100] animate-fade-in-up">
          <div className="py-1.5 max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {categories?.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/products?category=${cat.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                  >
                    {cat.image_url ? (
                      <img src={cat.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>{language === 'bn' ? cat.name_bn : cat.name_en}</span>
                  </Link>
                ))}
                <div className="border-t border-border mt-1 pt-1">
                  <Link
                    to="/categories"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-primary font-medium hover:bg-accent/50 transition-colors"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    {t('সব ক্যাটাগরি দেখুন', 'View All Categories')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
