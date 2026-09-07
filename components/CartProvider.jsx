"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildFourPacksFromSingles, getCartPricing } from "@/lib/pricing";

const CartContext = createContext(null);
// A new key keeps outdated dozen-priced items from older visits out of the
// current $4-single / $10-four-pack request flow.
const STORAGE_KEY = "bb_cart_v2";

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
    say(`${item.name} added to your request`);
  }, [say]);

  const remove = useCallback((key) => setItems((p) => p.filter((i) => i.key !== key)), []);
  const setQty = useCallback((key, qty) => {
    setItems((p) => (qty <= 0 ? p.filter((i) => i.key !== key)
      : p.map((i) => (i.key === key ? { ...i, qty } : i))));
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const convertSinglesToFourPacks = useCallback(() => {
    const { packCount, convertedPops } = buildFourPacksFromSingles(items);
    if (!packCount) return;

    setItems((current) => buildFourPacksFromSingles(current).items);
    say(`Switched ${convertedPops} singles to ${packCount} four-pack${packCount === 1 ? "" : "s"}`);
  }, [items, say]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const pricing = useMemo(() => getCartPricing(items), [items]);
  const subtotal = pricing.subtotal;

  const value = useMemo(
    () => ({
      items, add, remove, setQty, clear, count, subtotal,
      singlePopCount: pricing.singlePopCount,
      suggestedFourPacks: pricing.suggestedFourPacks,
      potentialSavings: pricing.potentialSavings,
      convertSinglesToFourPacks,
      open, setOpen, toast, say, ready,
    }),
    [
      items, add, remove, setQty, clear, count, subtotal,
      pricing.singlePopCount, pricing.suggestedFourPacks, pricing.potentialSavings,
      convertSinglesToFourPacks, open, toast, say, ready,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
