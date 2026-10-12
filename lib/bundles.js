export const PRETZEL_CATEGORY = "pretzel-rods";
export const DEFAULT_TREAT_PRICE = 3;
export const DEFAULT_TREAT_PAIR_PRICE = 5;
export const DEFAULT_MIXED_PACK_PRICE = 10;
export const DEFAULT_PRETZEL_ROD_PRICE = DEFAULT_TREAT_PRICE;
export const DEFAULT_PRETZEL_PAIR_PRICE = DEFAULT_TREAT_PAIR_PRICE;
export const CATEGORY_LABELS = {
  everyday: "Cake Pops",
  "pretzel-rods": "Pretzel Rods",
  "rice-crispy-treats": "Dipped Rice Crispy Treats",
  "dipped-oreos": "Dipped Oreos",
  custom: "Specialty & Custom Cake Pops",
};
export const MIXED_PACK_LIMITS = { "rice-crispy-treats": 1, "dipped-oreos": 2 };
export const MIXED_PACK_RULE =
  "Maximum 1 rice crispy treat and 2 Oreos per four-pack.";
export const isCakePopCategory = (category) =>
  ["everyday", "custom"].includes(category || "everyday");
export function treatTypeOf(item) {
  return (
    item.treatType ||
    (isCakePopCategory(item.category) ? "cake-pops" : item.category || "other")
  );
}
export const isCakePopProduct = (product) =>
  treatTypeOf(product) === "cake-pops";
export const bundleLimitType = (product) => treatTypeOf(product);
export const BUNDLE_GROUPS = {
  cakepop: {
    key: "cakepop",
    size: 2,
    noun: "cake pop",
    nounPlural: "cake pops",
    packName: "cake-pop pair",
    packNamePlural: "cake-pop pairs",
    orderName: "Two Cake Pops (2 pc)",
    cartPrefix: "box-2c-",
    packField: "treatPairPrice",
    builderPath: "/build-a-box?offer=cakepop",
  },
  mixed: {
    key: "mixed",
    size: 4,
    noun: "treat",
    nounPlural: "treats",
    packName: "mixed four-pack",
    packNamePlural: "mixed four-packs",
    orderName: "Mix & Match Four-Treat Pack (4 pc)",
    cartPrefix: "box-4m-",
    packField: "fourPackPrice",
    builderPath: "/build-a-box?offer=mixed",
  },
};
export function bundleGroupForCategory(category, treatType) {
  return isCakePopProduct({ category, treatType }) ? "cakepop" : "mixed";
}
export function getBundleGroup(key = "mixed") {
  return BUNDLE_GROUPS[key] || BUNDLE_GROUPS.mixed;
}
export function bundleGroupOfItem(item) {
  const key = String(item?.key || "");
  if (!key || key.startsWith("box-") || key.startsWith("weekly-box-"))
    return null;
  if (item.bundleEligible === false || Number(item.unitCount || 1) > 1)
    return null;
  if (item.category || item.treatType)
    return bundleGroupForCategory(item.category, item.treatType);
  // Older carts receive their category from the current menu when loaded.
  return ["mixed", "pretzel", "treat"].includes(item.bundleGroup)
    ? "mixed"
    : "cakepop";
}
export function canJoinBundle(groupKey, item) {
  const singleGroup = bundleGroupOfItem(item);
  return !!singleGroup && (groupKey === "mixed" || singleGroup === "cakepop");
}
export function bundleGroupForCartKey(key) {
  const value = String(key || "");
  if (value.startsWith("box-2c-") || value.startsWith("box-2t-"))
    return "cakepop";
  if (value.startsWith("box-4m-") || value.startsWith("box-4-")) return "mixed";
  return null;
}
export function isBundleCartKey(key) {
  return !!bundleGroupForCartKey(key);
}
export function bundlePrices(groupKey, prices = {}) {
  const single = Number(prices.singlePopPrice);
  const pack = Number(
    groupKey === "cakepop" ? prices.treatPairPrice : prices.fourPackPrice,
  );
  return {
    single: single > 0 ? single : 3,
    pack: pack > 0 ? pack : groupKey === "cakepop" ? 5 : 10,
  };
}
export function assertBundleSelection(groupKey, selections) {
  const group = getBundleGroup(groupKey);
  if (selections.reduce((n, item) => n + item.qty, 0) !== group.size)
    throw new Error(
      `Choose exactly ${group.size} pieces for this ${group.packName}.`,
    );
  if (
    selections.some(
      (item) =>
        item.bundleEligible === false || Number(item.unitCount || 1) > 1,
    )
  )
    throw new Error(
      "This product is sold with its own price and cannot join a treat pack.",
    );
  if (
    groupKey === "cakepop" &&
    selections.some((item) => !isCakePopProduct(item))
  )
    throw new Error(
      "The two-cake-pop offer is for cake pops only. Please rebuild this pair with cake pop flavors.",
    );
  if (groupKey === "mixed")
    for (const [category, limit] of Object.entries(MIXED_PACK_LIMITS)) {
      if (
        selections
          .filter((item) => bundleLimitType(item) === category)
          .reduce((n, item) => n + item.qty, 0) > limit
      )
        throw new Error(
          `A mixed four-pack can contain at most ${limit} ${category === "dipped-oreos" ? "Oreos" : "rice crispy treat"}${limit === 1 ? "" : ""}.`,
        );
    }
}
export function canonicalBoxItems(items = [], products = []) {
  if (!Array.isArray(items)) throw new Error("Choose the treats for the box.");
  const menu = new Map(products.map((product) => [product.slug, product]));
  return items.map((item) => {
    const product = menu.get(String(item?.slug || ""));
    if (!product || product.deletedAt)
      throw new Error(
        `${item?.name || "That item"} is no longer on the menu. Choose each item from your saved products.`,
      );
    return {
      ...item,
      name: product.name,
      unit_count: Number(product.unitCount || 1),
      unit_label: product.unitLabel || "treats",
    };
  });
}
