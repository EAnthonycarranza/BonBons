// The shop sells two things that bundle, on different terms: cake pops at four
// for one price, pretzel rods at two. Everything about a bundle lives here so
// adding a third never means hunting through the cart, the shop and the desk.
//
// A product's category decides which bundle it belongs to; `bundleEligible`
// decides whether it bundles at all, which is how a specialty $4 rod sits on
// the same menu as the $3 ones without dragging the maths off.

export const PRETZEL_CATEGORY = "pretzel-rods";

export const BUNDLE_GROUPS = {
  cakepop: {
    key: "cakepop",
    size: 4,
    noun: "cake pop",
    nounPlural: "cake pops",
    packName: "four-pack",
    packNamePlural: "four-packs",
    orderName: "Cake Pop Four-Pack (4 pc)",
    cartPrefix: "box-4-",
    singleField: "singlePopPrice",
    packField: "fourPackPrice",
    builderPath: "/build-a-box",
  },
  pretzel: {
    key: "pretzel",
    size: 2,
    noun: "pretzel rod",
    nounPlural: "pretzel rods",
    packName: "2-pack",
    packNamePlural: "2-packs",
    orderName: "Pretzel Rod 2-Pack (2 pc)",
    cartPrefix: "box-2p-",
    singleField: "pretzelRodPrice",
    packField: "pretzelPairPrice",
    builderPath: null,
  },
};

export const DEFAULT_PRETZEL_ROD_PRICE = 3;
export const DEFAULT_PRETZEL_PAIR_PRICE = 5;

export function bundleGroupForCategory(category) {
  return String(category || "") === PRETZEL_CATEGORY ? "pretzel" : "cakepop";
}

export function getBundleGroup(key) {
  return BUNDLE_GROUPS[key] || BUNDLE_GROUPS.cakepop;
}

// A cart item written before pretzel rods existed has no group; it can only
// ever have been a cake pop, so that is what it stays.
export function bundleGroupOfItem(item) {
  if (!item || item.bundleEligible !== true) return null;
  const key = String(item.bundleGroup || "cakepop");
  return BUNDLE_GROUPS[key] ? key : null;
}

export function isBundleCartKey(key) {
  const value = String(key || "");
  return Object.values(BUNDLE_GROUPS).some((group) => value.startsWith(group.cartPrefix));
}

export function bundleGroupForCartKey(key) {
  const value = String(key || "");
  const found = Object.values(BUNDLE_GROUPS).find((group) => value.startsWith(group.cartPrefix));
  return found ? found.key : null;
}

// The two numbers a group is priced by, falling back to the launch defaults so
// a missing setting can never make a bundle look free.
export function bundlePrices(groupKey, prices = {}) {
  const group = getBundleGroup(groupKey);
  const fallback = group.key === "pretzel"
    ? { single: DEFAULT_PRETZEL_ROD_PRICE, pack: DEFAULT_PRETZEL_PAIR_PRICE }
    : { single: 4, pack: 10 };
  const single = Number(prices[group.singleField]);
  const pack = Number(prices[group.packField]);
  return {
    single: single > 0 ? single : fallback.single,
    pack: pack > 0 ? pack : fallback.pack,
  };
}
