"use client";
import { createContext, useContext, useMemo } from "react";
import { DEFAULT_FOUR_PACK_PRICE, DEFAULT_SINGLE_POP_PRICE } from "@/lib/weekly-box";
import { DEFAULT_PRETZEL_PAIR_PRICE, DEFAULT_PRETZEL_ROD_PRICE } from "@/lib/bundles";
import { money } from "@/lib/format";

const PricesContext = createContext(null);

/**
 * Live shop prices, hydrated once from the server layout, so client components
 * quote what the owner actually set instead of a number baked into the copy.
 */
export function PricesProvider({ singlePopPrice, fourPackPrice, pretzelRodPrice, pretzelPairPrice, children }) {
  const value = useMemo(() => {
    const single = Number(singlePopPrice) > 0 ? Number(singlePopPrice) : DEFAULT_SINGLE_POP_PRICE;
    const pack = Number(fourPackPrice) > 0 ? Number(fourPackPrice) : DEFAULT_FOUR_PACK_PRICE;
    const rod = Number(pretzelRodPrice) > 0 ? Number(pretzelRodPrice) : DEFAULT_PRETZEL_ROD_PRICE;
    const pair = Number(pretzelPairPrice) > 0 ? Number(pretzelPairPrice) : DEFAULT_PRETZEL_PAIR_PRICE;
    return {
      singlePopPrice: single,
      fourPackPrice: pack,
      pretzelRodPrice: rod,
      pretzelPairPrice: pair,
      singleLabel: money(single),
      packLabel: money(pack),
      rodLabel: money(rod),
      pairLabel: money(pair),
    };
  }, [singlePopPrice, fourPackPrice, pretzelRodPrice, pretzelPairPrice]);
  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>;
}

export function usePrices() {
  return useContext(PricesContext) || {
    singlePopPrice: DEFAULT_SINGLE_POP_PRICE,
    fourPackPrice: DEFAULT_FOUR_PACK_PRICE,
    pretzelRodPrice: DEFAULT_PRETZEL_ROD_PRICE,
    pretzelPairPrice: DEFAULT_PRETZEL_PAIR_PRICE,
    singleLabel: money(DEFAULT_SINGLE_POP_PRICE),
    packLabel: money(DEFAULT_FOUR_PACK_PRICE),
    rodLabel: money(DEFAULT_PRETZEL_ROD_PRICE),
    pairLabel: money(DEFAULT_PRETZEL_PAIR_PRICE),
  };
}
