"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";

const CartContext = createContext(null);
const STORAGE_KEY = "bb_cart";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // Load after mount — reading localStorage during render would break SSR.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    setReady(true);
  }, []);

  // Don't write until the initial read finished, or we'd clobber saved carts.
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
  }, [items, ready]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const say = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  const add = useCallback((item) => {
    setItems((prev) => {
      const i = prev.findIndex((x) => x.key === item.key);
      if (i === -1) return [...prev, { ...item, qty: item.qty || 1 }];
      const next = [...prev];
      next[i] = { ...next[i], qty: next[i].qty + (item.qty || 1) };
      return next;
    });
    say(`${item.name} added to cart`);
  }, [say]);

  const remove = useCallback((key) => setItems((p) => p.filter((i) => i.key !== key)), []);
  const setQty = useCallback((key, qty) => {
    setItems((p) => (qty <= 0 ? p.filter((i) => i.key !== key)
      : p.map((i) => (i.key === key ? { ...i, qty } : i))));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((n, i) => n + i.price * i.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, add, remove, setQty, clear, count, subtotal, open, setOpen, toast, say, ready }),
    [items, add, remove, setQty, clear, count, subtotal, open, toast, say, ready]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
