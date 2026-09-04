import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CatalogItem } from "../data/catalog";
import { useAuth } from "./AuthContext";
import { isProvider } from "../demo";

const CART_KEY = "najik_cart_v1";

export type CartEntry = {
  id: string;
  item: CatalogItem;
  addedAt: number;
};

type CartValue = {
  items: CartEntry[];
  count: number;
  has: (id: string) => boolean;
  add: (item: CatalogItem) => boolean;
  remove: (id: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

async function readCart(): Promise<CartEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartEntry[];
    return Array.isArray(parsed) ? parsed.filter((row) => row?.id && row?.item) : [];
  } catch {
    return [];
  }
}

async function writeCart(items: CartEntry[]) {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartEntry[]>([]);

  useEffect(() => {
    if (!user || isProvider(user)) {
      setItems([]);
      return;
    }
    void readCart().then(setItems);
  }, [user?.id]);

  const persist = useCallback((next: CartEntry[]) => {
    setItems(next);
    void writeCart(next);
  }, []);

  const has = useCallback((id: string) => items.some((row) => row.id === id), [items]);

  const add = useCallback(
    (item: CatalogItem) => {
      if (!item?.id) return false;
      if (items.some((row) => row.id === item.id)) return false;
      const next = [{ id: item.id, item, addedAt: Date.now() }, ...items];
      persist(next);
      return true;
    },
    [items, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((row) => row.id !== id));
    },
    [items, persist],
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  const value = useMemo(
    () => ({ items, count: items.length, has, add, remove, clear }),
    [items, has, add, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [] as CartEntry[],
      count: 0,
      has: () => false,
      add: () => false,
      remove: () => {},
      clear: () => {},
    };
  }
  return ctx;
}
