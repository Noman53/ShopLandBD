import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recently-viewed-products';
const MAX_ITEMS = 10;

export function useRecentlyViewed() {
  const [viewedIds, setViewedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setViewedIds(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const addProduct = useCallback((productId: string) => {
    setViewedIds((prev) => {
      const filtered = prev.filter(id => id !== productId);
      const updated = [productId, ...filtered].slice(0, MAX_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  return { viewedIds, addProduct };
}
