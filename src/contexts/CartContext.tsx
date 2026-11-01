import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const CART_TIMEOUT_MS = 45 * 60 * 1000; // 45 minutes

export interface CartItem {
  id: string;
  productId: string;
  name_bn: string;
  name_en: string;
  price: number;
  discount_price: number | null;
  quantity: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function isCartExpired(): boolean {
  const ts = localStorage.getItem('cart-timestamp');
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) > CART_TIMEOUT_MS;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (isCartExpired()) {
      localStorage.removeItem('cart-items');
      localStorage.removeItem('cart-timestamp');
      return [];
    }
    const stored = localStorage.getItem('cart-items');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart-items', JSON.stringify(items));
    if (items.length > 0) {
      localStorage.setItem('cart-timestamp', Date.now().toString());
    } else {
      localStorage.removeItem('cart-timestamp');
    }
  }, [items]);

  const addItem = (item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === item.productId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += item.quantity;
        return updated;
      }
      return [...prev, { ...item, id: crypto.randomUUID() }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_price ?? item.price;
    return sum + price * item.quantity;
  }, 0);

  const total = subtotal;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
