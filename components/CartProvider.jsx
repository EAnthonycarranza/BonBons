"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { buildBundlesFromSingles, getCartPricing, hydrateCartItems } from "@/lib/pricing";
import { getBundleGroup } from "@/lib/bundles";
import { usePrices } from "./PricesProvider";

const CartContext = createContext(null);
// Keep saved requests and refresh them against current menu categories and
// pack rules. Invalid old packs are shown so customers can remove them.
const STORAGE_KEY = "bb_cart_v2";

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

export function CartProvider({ children }) {
  // PricesProvider wraps this in the root layout, so live prices are available.
  const prices = usePrices();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // Load after mount — reading localStorage during render would break SSR.
  useEffect(() => {
    let cancelled=false;
    async function load() {
      let saved=[];
      try { const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");if(Array.isArray(parsed))saved=parsed; }catch{}
      try { const response=await fetch("/api/products",{cache:"no-store"});if(response.ok){const data=await response.json();saved=hydrateCartItems(saved,data.products||[],prices);} }catch{}
      if(!cancelled){setItems(saved);setReady(true);}
    }
    load();return()=>{cancelled=true;};
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

  // Customers choose cake-pop pairs or mixed four-packs.
  const convertSinglesToBundles = useCallback((groupKey = "mixed") => {
    const group = getBundleGroup(groupKey);
    const { packCount, convertedUnits } = buildBundlesFromSingles(items, prices, groupKey);
    if (!packCount) return;

    setItems((current) => buildBundlesFromSingles(current, prices, groupKey).items);
    const packLabel = packCount === 1 ? group.packName : group.packNamePlural;
    say(`Switched ${convertedUnits} singles to ${packCount} ${packLabel}`);
  }, [items, prices, say]);

  const convertSinglesToFourPacks = useCallback(() => convertSinglesToBundles("mixed"), [convertSinglesToBundles]);

  const count = useMemo(() => items.reduce((n, i) => n + i.qty, 0), [items]);
  const pricing = useMemo(() => getCartPricing(items, prices), [items, prices]);
  const subtotal = pricing.subtotal;

  const value = useMemo(
    () => ({
      items, add, remove, setQty, clear, count, subtotal,
      singlePopCount: pricing.singlePopCount,
      suggestedFourPacks: pricing.suggestedFourPacks,
      potentialSavings: pricing.potentialSavings,
      bundleGroups: pricing.groups,
      convertSinglesToBundles,
      convertSinglesToFourPacks,
      open, setOpen, toast, say, ready,
    }),
    [
      items, add, remove, setQty, clear, count, subtotal,
      pricing.singlePopCount, pricing.suggestedFourPacks, pricing.potentialSavings,
      pricing.groups, convertSinglesToBundles, convertSinglesToFourPacks,
      open, toast, say, ready,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
