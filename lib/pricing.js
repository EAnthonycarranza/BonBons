import {
  BUNDLE_GROUPS,
  canJoinBundle,
  bundlePrices,
  getBundleGroup,
  MIXED_PACK_LIMITS,
  bundleGroupForCartKey,
  assertBundleSelection,
  bundleLimitType,
  bundleGroupForCategory,
} from "./bundles.js";
import { saleDescription } from "./menu-categories.js";
export const SINGLE_POP_PRICE = 3;
export const FOUR_PACK_SIZE = 4;
export const FOUR_PACK_PRICE = 10;
export function isFourPackEligible(item) {
  return canJoinBundle("mixed", item);
}
const quantityOf = (item) =>
  Math.min(50, Math.max(0, Math.floor(Number(item?.qty) || 0)));

// Put limited categories into packs first, so restricted leftovers do not
// strand ingredients that could have fit alongside unrestricted treats.
function planPacks(items, groupKey) {
  const group = getBundleGroup(groupKey);
  const units = items.flatMap((item) =>
    canJoinBundle(groupKey, item)
      ? Array.from({ length: quantityOf(item) }, () => item)
      : [],
  );
  const remaining = [...units],
    batches = [];
  while (remaining.length >= group.size) {
    const batch = [];
    if (groupKey === "mixed")
      for (const [category, limit] of Object.entries(MIXED_PACK_LIMITS)) {
        for (let n = 0; n < limit; n++) {
          const index = remaining.findIndex(
            (item) => bundleLimitType(item) === category,
          );
          if (index < 0) break;
          batch.push(remaining.splice(index, 1)[0]);
        }
      }
    while (batch.length < group.size) {
      const index = remaining.findIndex(
        (item) =>
          groupKey !== "mixed" || !MIXED_PACK_LIMITS[bundleLimitType(item)],
      );
      if (index < 0) break;
      batch.push(remaining.splice(index, 1)[0]);
    }
    if (batch.length < group.size) {
      remaining.push(...batch);
      break;
    }
    batches.push(batch);
  }
  return { batches, remaining, units };
}
export function getCartPricing(items = [], prices = {}) {
  const regularTotal =
    Math.round(
      items.reduce(
        (sum, item) =>
          sum + Math.max(0, Number(item.price) || 0) * quantityOf(item),
        0,
      ) * 100,
    ) / 100;
  const groups = Object.keys(BUNDLE_GROUPS).map((key) => {
    const group = getBundleGroup(key),
      plan = planPacks(items, key),
      { pack } = bundlePrices(key, prices);
    return {
      ...group,
      singleCount: plan.units.length,
      suggestedPacks: plan.batches.length,
      potentialSavings: Math.max(
        0,
        Math.round(
          (plan.batches
            .flat()
            .reduce((sum, item) => sum + Number(item.price), 0) -
            plan.batches.length * pack) *
            100,
        ) / 100,
      ),
    };
  });
  const cakepop = groups.find((group) => group.key === "cakepop"),
    mixed = groups.find((group) => group.key === "mixed");
  // These offers overlap; never add their potential savings together.
  const potentialSavings = Math.max(
    ...groups.map((group) => group.potentialSavings),
  );
  return {
    groups,
    bundleSavings: potentialSavings,
    singlePopCount: cakepop.singleCount,
    suggestedFourPacks: mixed.suggestedPacks,
    potentialSavings,
    regularTotal,
    subtotal: regularTotal,
  };
}
export function buildBundlesFromSingles(
  items = [],
  prices = {},
  groupKey = "mixed",
) {
  const group = getBundleGroup(groupKey),
    { pack: packPrice } = bundlePrices(groupKey, prices),
    { batches, remaining } = planPacks(items, groupKey);
  if (!batches.length)
    return { items, convertedUnits: 0, convertedPops: 0, packCount: 0 };
  const result = new Map();
  const put = (item) => {
    const existing = result.get(item.key);
    if (existing) existing.qty += item.qty;
    else result.set(item.key, { ...item });
  };
  items
    .filter((item) => !canJoinBundle(groupKey, item))
    .forEach((item) => put({ ...item, qty: quantityOf(item) }));
  remaining.forEach((item) => put({ ...item, qty: 1 }));
  for (const batch of batches) {
    const flavors = [...new Set(batch.map((item) => item.key))].map((slug) => ({
      slug,
      qty: batch.filter((item) => item.key === slug).length,
    }));
    const key =
      group.cartPrefix +
      flavors
        .map((item) => `${item.slug}:${item.qty}`)
        .sort()
        .join("+");
    const desc = flavors
      .map(
        (flavor) =>
          `${batch.find((item) => item.key === flavor.slug).name} x${flavor.qty}`,
      )
      .join(", ");
    put({
      key,
      name: group.orderName,
      desc,
      price: packPrice,
      qty: 1,
      bundleEligible: false,
      flavors,
      icon: "i-favor",
      color: "#FFD34E",
      tint: "255,211,78",
    });
  }
  const convertedUnits = batches.length * group.size;
  return {
    items: [...result.values()],
    convertedUnits,
    convertedPops: convertedUnits,
    packCount: batches.length,
  };
}
export function buildFourPacksFromSingles(items = [], prices = {}) {
  return buildBundlesFromSingles(items, prices, "mixed");
}

export function hydrateCartItems(items, products, prices = {}) {
  const menu = new Map(products.map((product) => [product.slug, product]));
  return items.map((item) => {
    const product = menu.get(item.key);
    if (product)
      return {
        ...item,
        name: product.name,
        desc: saleDescription(product),
        price: product.price,
        category: product.category,
        treatType: product.treatType,
        unitCount: product.unitCount,
        unitLabel: product.unitLabel,
        bundleEligible: product.bundleEligible,
        bundleGroup: bundleGroupForCategory(
          product.category,
          product.treatType,
        ),
        invalidBundle: false,
      };
    if (!String(item.key).startsWith("box-")) return item;
    const groupKey = bundleGroupForCartKey(item.key);
    try {
      if (
        !groupKey ||
        !Array.isArray(item.flavors) ||
        !item.flavors.length ||
        new Set(item.flavors.map((f) => f.slug)).size !== item.flavors.length
      )
        throw Error();
      const selections = item.flavors.map((f) => {
        const p = menu.get(f.slug);
        if (!p || !Number.isInteger(f.qty) || f.qty < 1) throw Error();
        return { ...p, slug: f.slug, qty: f.qty };
      });
      assertBundleSelection(groupKey, selections);
      return {
        ...item,
        name: getBundleGroup(groupKey).orderName,
        price: bundlePrices(groupKey, prices).pack,
        invalidBundle: false,
      };
    } catch {
      return { ...item, invalidBundle: true };
    }
  });
}
