export const PRETZEL_CATEGORY = "pretzel-rods";
export const DEFAULT_TREAT_PRICE = 3;
export const DEFAULT_TREAT_PAIR_PRICE = 5;
// Retained for callers and existing shop settings while all flavors
// now share one offer.
export const DEFAULT_PRETZEL_ROD_PRICE = DEFAULT_TREAT_PRICE;
export const DEFAULT_PRETZEL_PAIR_PRICE = DEFAULT_TREAT_PAIR_PRICE;

export const CATEGORY_LABELS = {
  everyday: "Cake Pops",
  "pretzel-rods": "Pretzel Rods",
  "rice-crispy-treats": "Dipped Rice Crispy Treats",
  "dipped-oreos": "Dipped Oreos",
  custom: "Specialty & Custom Treats",
};

export const BUNDLE_GROUPS = {
  treat: {
    key: "treat", size: 2, noun: "treat", nounPlural: "treats",
    packName: "two-treat pack", packNamePlural: "two-treat packs",
    orderName: "Mix & Match Two-Treat Pack (2 pc)", cartPrefix: "box-2t-",
    singleField: "singlePopPrice", packField: "treatPairPrice", builderPath: "/build-a-box",
  },
};

export function bundleGroupForCategory() { return "treat"; }
export function getBundleGroup() { return BUNDLE_GROUPS.treat; }

export function bundleGroupOfItem(item) {
  const key = String(item?.key || "");
  // Every single flavor counts, including saved products with an old false
  // eligibility flag. Completed packs and curated weekly boxes count separately.
  return key && !key.startsWith("box-") && !key.startsWith("weekly-box-") ? "treat" : null;
}

export function bundleGroupForCartKey(key) {
  const value = String(key || "");
  return value.startsWith("box-2t-") || value.startsWith("box-2p-") ? "treat" : null;
}
export function isBundleCartKey(key) { return !!bundleGroupForCartKey(key); }

export function bundlePrices(groupKey, prices = {}) {
  const single = Number(prices.singlePopPrice);
  const pack = Number(prices.treatPairPrice ?? prices.pretzelPairPrice);
  return {
    single: single > 0 ? single : DEFAULT_TREAT_PRICE,
    pack: pack > 0 ? pack : DEFAULT_TREAT_PAIR_PRICE,
  };
}

// The separately priced Box of the Week remains a curated cake-pop box.
export function assertBoxItemsAreCakePops(items = [], products = []) {
  const menu = new Map(products.map(product => [product.slug, product]));
  for (const item of items) {
    const product = menu.get(String(item?.slug || ""));
    if (!product) throw new Error(`${item?.name || "That item"} is no longer on the menu. Choose each item from the cake-pop menu.`);
    if (!["everyday", "custom"].includes(product.category || "everyday")) {
      throw new Error(`${product.name} cannot go in the Box of the Week. This curated box holds cake pops only.`);
    }
  }
}
