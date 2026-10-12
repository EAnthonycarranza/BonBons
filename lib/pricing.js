// Launch defaults. The owner's current prices come from shop_settings and are
// passed in, so the savings shown to a customer always match what they pay.
import {
  BUNDLE_GROUPS,
  bundleGroupOfItem,
  bundlePrices,
  getBundleGroup,
} from "./bundles.js";

export const SINGLE_POP_PRICE = 3;
export const FOUR_PACK_SIZE = 2;
export const FOUR_PACK_PRICE = 5;

export function isFourPackEligible(item) {
  return bundleGroupOfItem(item) === "treat";
}

// Which bundle an item counts toward, including the legacy items that predate
// the flag and can only ever have been cake pops.
function groupOf(item) {
  return bundleGroupOfItem(item);
}

export function getCartPricing(items = [], prices = {}) {
  let regularTotal = 0;
  const counts = new Map();
  const eligiblePrices = new Map();

  for (const item of items) {
    const quantity = Math.max(0, Number(item?.qty) || 0);
    const price = Math.max(0, Number(item?.price) || 0);
    regularTotal += price * quantity;
    const group = groupOf(item, prices);
    if (group) {
      counts.set(group, (counts.get(group) || 0) + quantity);
      const prices = eligiblePrices.get(group) || [];
      for (let unit = 0; unit < quantity; unit++) prices.push(price);
      eligiblePrices.set(group, prices);
    }
  }

  const groups = Object.keys(BUNDLE_GROUPS).map((key) => {
    const group = getBundleGroup(key);
    const { single, pack } = bundlePrices(key, prices);
    const singleCount = counts.get(key) || 0;
    const packs = Math.floor(singleCount / group.size);
    return {
      key,
      size: group.size,
      noun: group.noun,
      nounPlural: group.nounPlural,
      packName: group.packName,
      packNamePlural: group.packNamePlural,
      singleCount,
      suggestedPacks: packs,
      potentialSavings: Math.max(0, Math.round(((eligiblePrices.get(key) || []).slice(0, packs * group.size).reduce((sum, price) => sum + price, 0) - packs * pack) * 100) / 100),
    };
  });

  const cakepop = groups.find((g) => g.key === "treat");
  return {
    groups,
    bundleSavings: groups.reduce((sum, g) => sum + g.potentialSavings, 0),
    // Kept so existing callers and saved carts keep working unchanged.
    singlePopCount: cakepop.singleCount,
    suggestedFourPacks: cakepop.suggestedPacks,
    potentialSavings: cakepop.potentialSavings,
    regularTotal: Math.round(regularTotal * 100) / 100,
    subtotal: Math.round(regularTotal * 100) / 100,
  };
}

/**
 * Turns loose singles from every product category into mixed pairs. Existing
 * packs and curated weekly boxes pass through untouched.
 */
export function buildBundlesFromSingles(items = [], prices = {}, groupKey = "treat") {
  const group = getBundleGroup(groupKey);
  const { pack: packPrice } = bundlePrices(groupKey, prices);
  const quantityOf = (item) => Math.min(50, Math.max(0, Math.floor(Number(item?.qty) || 0)));
  const inGroup = (item) => groupOf(item, prices) === group.key;

  const eligibleUnits = items.flatMap((item) =>
    inGroup(item) ? Array.from({ length: quantityOf(item) }, () => item) : []
  );
  const packCount = Math.floor(eligibleUnits.length / group.size);
  if (!packCount) return { items, convertedPops: 0, convertedUnits: 0, packCount: 0 };

  const itemsToPack = eligibleUnits.slice(0, packCount * group.size);
  const remainingUnits = eligibleUnits.slice(packCount * group.size);
  const resultByKey = new Map();
  const remainingByKey = new Map();

  for (const item of items.filter((entry) => !inGroup(entry))) {
    const existing = resultByKey.get(item.key);
    if (existing) existing.qty += quantityOf(item);
    else resultByKey.set(item.key, { ...item, qty: quantityOf(item) });
  }

  for (const item of remainingUnits) {
    const existing = remainingByKey.get(item.key);
    if (existing) existing.qty += 1;
    else remainingByKey.set(item.key, { ...item, qty: 1 });
  }

  for (let index = 0; index < itemsToPack.length; index += group.size) {
    const batch = itemsToPack.slice(index, index + group.size);
    const flavorCounts = new Map();
    for (const item of batch) {
      flavorCounts.set(item.name, (flavorCounts.get(item.name) || 0) + 1);
    }
    const contents = [...flavorCounts.entries()].map(([name, qty]) => `${name} x${qty}`).join(", ");
    const key = `${group.cartPrefix}${batch.map((item) => item.key).sort().join("+")}`;
    const existing = resultByKey.get(key);

    if (existing) existing.qty += 1;
    else {
      resultByKey.set(key, {
        key,
        name: "Mix & Match Two-Treat Pack",
        desc: contents,
        price: packPrice,
        qty: 1,
        bundleEligible: false,
        flavors: [...new Set(batch.map((item) => item.key))].map((slug) => ({
          slug, qty: batch.filter((item) => item.key === slug).length,
        })),
        icon: group.key === "pretzel" ? "i-krispie" : "i-favor",
        color: group.key === "pretzel" ? "#3B9BFF" : "#FFD34E",
        tint: group.key === "pretzel" ? "59,155,255" : "255,211,78",
      });
    }
  }

  const convertedUnits = packCount * group.size;
  return {
    items: [...resultByKey.values(), ...remainingByKey.values()],
    convertedUnits,
    convertedPops: convertedUnits,
    packCount,
  };
}

// The original name, kept so nothing that already calls it has to change.
export function buildFourPacksFromSingles(items = [], prices = {}) {
  return buildBundlesFromSingles(items, prices, "treat");
}
