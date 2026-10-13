export const MYSTERY_BAG_TEMPLATE = {
  name: "Mystery 4 Pack Bags",
  slug: "mystery-4-pack-bags",
  price: 10,
  offering_type: "mystery-bag",
  selling_format: "mystery-bag",
  unit_count: 4,
  unit_label: "cake pops",
  bonus_description: "a sweet surprise",
  blurb: "Includes 4 cake pops and a sweet surprise!",
  description:
    "A surprise assortment chosen by Bon Bon. Each bag includes 4 cake pops and a sweet surprise!",
  category: "mystery-bags",
  badge: "Mystery bag",
  bundle_eligible: false,
  stock_quantity: 4,
  low_stock_threshold: 2,
  active: false,
};

export function isMysteryBag(product) {
  return (product?.offeringType ?? product?.offering_type) === "mystery-bag";
}

export function sellingContainer(product) {
  return isMysteryBag(product)
    ? "bag"
    : Number(product.unitCount ?? product.unit_count ?? 1) > 1
      ? "batch"
      : "item";
}

export function bagContents(product) {
  const count = product.unitCount ?? product.unit_count ?? 4;
  const label = product.unitLabel || product.unit_label || "cake pops";
  const bonus = product.bonusDescription ?? product.bonus_description ?? "";
  return `${count} ${label}${bonus ? ` + ${bonus}` : ""}`;
}

export function mysteryBagCopy(product) {
  const count = product.unitCount ?? product.unit_count ?? 4;
  const label = product.unitLabel || product.unit_label || "cake pops";
  const bonus = product.bonusDescription ?? product.bonus_description ?? "";
  const contents = `${count} ${label}${bonus ? ` and ${bonus}` : ""}!`;
  return {
    name: `Mystery ${count} Pack Bags`,
    blurb: `Includes ${contents}`,
    description: `A surprise assortment chosen by Bon Bon. Each bag includes ${contents}`,
  };
}

export function syncMysteryBagCopy(previous, next) {
  if (!isMysteryBag(previous) || !isMysteryBag(next)) return next;
  const oldCopy = mysteryBagCopy(previous);
  const newCopy = mysteryBagCopy(next);
  return {
    ...next,
    ...Object.fromEntries(
      Object.entries(newCopy).filter(([key]) => previous[key] === oldCopy[key]),
    ),
  };
}
