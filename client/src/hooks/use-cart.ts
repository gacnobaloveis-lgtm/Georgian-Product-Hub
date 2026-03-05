import { useState, useEffect, useCallback, createContext, useContext } from "react";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  selectedColor: string | null;
  maxStock: number;
}

function cartKey(item: { productId: number; selectedColor: string | null }) {
  return `${item.productId}_${item.selectedColor || "default"}`;
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem("cart", JSON.stringify(items));
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: number, selectedColor: string | null) => void;
  updateQuantity: (productId: number, selectedColor: string | null, quantity: number) => void;
  clearItems: (keys: { productId: number; selectedColor: string | null }[]) => void;
  clearAll: () => void;
  totalCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export { CartContext };

export function useCartProvider() {
  const [items, setItems] = useState<CartItem[]>(loadCart);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const key = cartKey(item);
      const existing = prev.find(i => cartKey(i) === key);
      if (existing) {
        return prev.map(i =>
          cartKey(i) === key
            ? { ...i, quantity: Math.min(i.maxStock, i.quantity + item.quantity) }
            : i
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((productId: number, selectedColor: string | null) => {
    setItems(prev => prev.filter(i => cartKey(i) !== cartKey({ productId, selectedColor })));
  }, []);

  const updateQuantity = useCallback((productId: number, selectedColor: string | null, quantity: number) => {
    setItems(prev =>
      prev.map(i =>
        cartKey(i) === cartKey({ productId, selectedColor })
          ? { ...i, quantity: Math.max(1, Math.min(i.maxStock, quantity)) }
          : i
      )
    );
  }, []);

  const clearItems = useCallback((keys: { productId: number; selectedColor: string | null }[]) => {
    const keySet = new Set(keys.map(k => cartKey(k)));
    setItems(prev => prev.filter(i => !keySet.has(cartKey(i))));
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return { items, addItem, removeItem, updateQuantity, clearItems, clearAll, totalCount };
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
