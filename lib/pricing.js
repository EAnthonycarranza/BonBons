// Launch defaults. The owner's current prices come from shop_settings and are
// passed in, so the savings shown to a customer always match what they pay.
export const SINGLE_POP_PRICE = 4;
export const FOUR_PACK_SIZE = 4;
export const FOUR_PACK_PRICE = 10;

export function isFourPackEligible(item, singlePopPrice = SINGLE_POP_PRICE) {
  if (item?.bundleEligible === false) return false;
  if (item?.bundleEligible === true) return true;
  // Only legacy saved items reach here without the flag.
  const key = String(item?.key || "");
  return Number(item?.price) === Number(singlePopPrice) && !key.startsWith("box-");
}

export function getCartPricing(items = [], prices = {}) {
  const singlePrice = Number(prices.singlePopPrice) > 0 ? Number(prices.singlePopPrice) : SINGLE_POP_PRICE;
  const packPrice = Number(prices.fourPackPrice) > 0 ? Number(prices.fourPackPrice) : FOUR_PACK_PRICE;
  let regularTotal = 0;
  let singlePopCount = 0;

  for (const item of items) {
    const quantity = Math.max(0, Number(item?.qty) || 0);
    const price = Math.max(0, Number(item?.price) || 0);
    regularTotal += price * quantity;
    if (isFourPackEligible(item, singlePrice)) singlePopCount += quantity;
  }

  const suggestedFourPacks = Math.floor(singlePopCount / FOUR_PACK_SIZE);
  const potentialSavings = Math.max(0, suggestedFourPacks * (singlePrice * FOUR_PACK_SIZE - packPrice));

  return {
    singlePopCount,
    suggestedFourPacks,
    potentialSavings,
    regularTotal,
    subtotal: regularTotal,
  };
}

export function buildFourPacksFromSingles(items = [], prices = {}) {
  const singlePrice = Number(prices.singlePopPrice) > 0 ? Number(prices.singlePopPrice) : SINGLE_POP_PRICE;
  const packPrice = Number(prices.fourPackPrice) > 0 ? Number(prices.fourPackPrice) : FOUR_PACK_PRICE;
  const quantityOf = (item) => Math.min(50, Math.max(0, Math.floor(Number(item?.qty) || 0)));
  const eligibleUnits = items.flatMap((item) =>
    isFourPackEligible(item, singlePrice)
      ? Array.from({ length: quantityOf(item) }, () => item)
      : []
  );
  const packCount = Math.floor(eligibleUnits.length / FOUR_PACK_SIZE);
  if (!packCount) return { items, convertedPops: 0, packCount: 0 };

  const itemsToPack = eligibleUnits.slice(0, packCount * FOUR_PACK_SIZE);
  const remainingUnits = eligibleUnits.slice(packCount * FOUR_PACK_SIZE);
  const resultByKey = new Map();
  const remainingByKey = new Map();

  for (const item of items.filter((entry) => !isFourPackEligible(entry, singlePrice))) {
    const existing = resultByKey.get(item.key);
    if (existing) existing.qty += quantityOf(item);
    else resultByKey.set(item.key, { ...item, qty: quantityOf(item) });
  }

  for (const item of remainingUnits) {
    const existing = remainingByKey.get(item.key);
    if (existing) existing.qty += 1;
    else remainingByKey.set(item.key, { ...item, qty: 1 });
  }

  for (let index = 0; index < itemsToPack.length; index += FOUR_PACK_SIZE) {
    const group = itemsToPack.slice(index, index + FOUR_PACK_SIZE);
    const flavorCounts = new Map();
    for (const item of group) {
      flavorCounts.set(item.name, (flavorCounts.get(item.name) || 0) + 1);
    }
    const contents = [...flavorCounts.entries()]
      .map(([name, qty]) => `${name} x${qty}`)
      .join(", ");
    const groupKey = group.map((item) => item.key).sort().join("+");
    const key = `box-4-${groupKey}`;
    const existing = resultByKey.get(key);

    if (existing) existing.qty += 1;
    else {
      resultByKey.set(key, {
        key,
        name: "Cake Pop Four-Pack",
        desc: contents,
        price: packPrice,
        qty: 1,
        bundleEligible: false,
        flavors: [...new Set(group.map((item) => item.key))].map((slug) => ({
          slug, qty: group.filter((item) => item.key === slug).length,
        })),
        icon: "i-favor",
        color: "#FFD34E",
        tint: "255,211,78",
      });
    }
  }

  return {
    items: [...resultByKey.values(), ...remainingByKey.values()],
    convertedPops: packCount * FOUR_PACK_SIZE,
    packCount,
  };
}
