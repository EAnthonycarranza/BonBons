"use client";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_FOUR_PACK_PRICE, DEFAULT_SINGLE_POP_PRICE } from "@/lib/weekly-box";
import { money } from "@/lib/format";

const PricesContext = createContext(null);

/**
 * Live shop prices, hydrated once from the server layout, so client components
 * quote what the owner actually set instead of a number baked into the copy.
 */
export function PricesProvider({ singlePopPrice, fourPackPrice, children }) {
  const value = useMemo(() => {
    const single = Number(singlePopPrice) > 0 ? Number(singlePopPrice) : DEFAULT_SINGLE_POP_PRICE;
    const pack = Number(fourPackPrice) > 0 ? Number(fourPackPrice) : DEFAULT_FOUR_PACK_PRICE;
    return {
      singlePopPrice: single,
      fourPackPrice: pack,
      singleLabel: money(single),
      packLabel: money(pack),
    };
  }, [singlePopPrice, fourPackPrice]);
  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}

export function usePrices() {
  return useContext(PricesContext) || {
    singlePopPrice: DEFAULT_SINGLE_POP_PRICE,
    fourPackPrice: DEFAULT_FOUR_PACK_PRICE,
    singleLabel: money(DEFAULT_SINGLE_POP_PRICE),
    packLabel: money(DEFAULT_FOUR_PACK_PRICE),
  };
}
