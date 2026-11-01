import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  name_bn: string;
  name_en: string;
  price: number;
  discount_price: number | null;
  images: string[] | null;
}

interface SearchAutocompleteProps {
  isMobile?: boolean;
  onClose?: () => void;
}

export default function SearchAutocomplete({ isMobile = false, onClose }: SearchAutocompleteProps) {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search
  const searchProducts = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name_bn, name_en, price, discount_price, images')
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`name_bn.ilike.%${searchQuery}%,name_en.ilike.%${searchQuery}%`)
        .limit(6);

      if (!error && data) {
        setResults(data);
        setShowResults(true);
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProducts(value), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
      onClose?.();
    }
  };

  const handleSelectProduct = (productId: string) => {
    navigate(`/products/${productId}`);
    setShowResults(false);
    setQuery('');
    onClose?.();
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    onClose?.();
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", isMobile && "w-full")}>
      <form onSubmit={handleSubmit} className="relative">
        {isMobile && (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={t('পণ্য খুঁজুন...', 'Search products...')}
          className={cn(
            "rounded-full border border-border bg-background focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm",
            isMobile ? "w-full pl-10 pr-10 py-2.5" : "w-64 pl-4 pr-10 py-2"
          )}
          autoFocus
        />
        <button
          type="button"
          onClick={handleClear}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
            isMobile ? "right-4" : "right-3"
          )}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        </button>
      </form>

      {/* Autocomplete Results */}
      {showResults && results.length > 0 && (
        <div className={cn(
          "absolute top-full mt-2 bg-popover border border-border rounded-xl shadow-lg overflow-hidden z-[100]",
          isMobile ? "left-0 right-0" : "left-0 w-80"
        )}>
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-accent/10 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                {product.images && product.images[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {language === 'bn' ? product.name_bn : product.name_en}
                </p>
                <p className="text-xs text-primary font-medium">
                  {formatPrice(product.discount_price ? Number(product.discount_price) : Number(product.price), language)}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={handleSubmit as any}
            className="w-full p-3 text-center text-sm text-primary font-medium hover:bg-accent/10 transition-colors border-t border-border"
          >
            {t('সব ফলাফল দেখুন', 'View all results')} →
          </button>
        </div>
      )}

      {/* No results */}
      {showResults && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className={cn(
          "absolute top-full mt-2 bg-popover border border-border rounded-xl shadow-lg p-4 text-center z-[100]",
          isMobile ? "left-0 right-0" : "left-0 w-80"
        )}>
          <p className="text-sm text-muted-foreground">
            {t('কোনো পণ্য পাওয়া যায়নি', 'No products found')}
          </p>
        </div>
      )}
    </div>
  );
}
