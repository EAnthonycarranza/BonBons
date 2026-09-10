import test from "node:test";
import assert from "node:assert/strict";
import { getCartPricing, buildBundlesFromSingles, buildFourPacksFromSingles } from "../lib/pricing.js";
import { assertBoxItemsAreCakePops, bundleGroupForCategory, bundlePrices } from "../lib/bundles.js";
import { normalizeOrderItems } from "../lib/order-menu.js";

const PRICES = { singlePopPrice: 3, fourPackPrice: 10, pretzelRodPrice: 3, pretzelPairPrice: 5 };

const rod = (key, qty, price = 3, bundleEligible = true) => ({
  key, name: key, qty, price, bundleEligible, bundleGroup: "pretzel",
});
const pop = (key, qty, price = 3) => ({
  key, name: key, qty, price, bundleEligible: true, bundleGroup: "cakepop",
});

test("a product's category decides which bundle it counts toward", () => {
  assert.equal(bundleGroupForCategory("pretzel-rods"), "pretzel");
  assert.equal(bundleGroupForCategory("everyday"), "cakepop");
  assert.equal(bundleGroupForCategory("custom"), "cakepop");
  assert.equal(bundleGroupForCategory(undefined), "cakepop");
});

test("pretzel rods bundle in twos, cake pops in fours", () => {
  const pricing = getCartPricing([rod("sprinkle", 4), pop("cookie-monster", 4)], PRICES);
  const pretzel = pricing.groups.find((g) => g.key === "pretzel");
  const cakepop = pricing.groups.find((g) => g.key === "cakepop");

  assert.equal(pretzel.singleCount, 4);
  assert.equal(pretzel.suggestedPacks, 2);
  // 4 rods at $3 is $12; two pairs at $5 is $10.
  assert.equal(pretzel.potentialSavings, 2);

  assert.equal(cakepop.singleCount, 4);
  assert.equal(cakepop.suggestedPacks, 1);
  assert.equal(cakepop.potentialSavings, 2);
});

test("a specialty rod is priced on its own and never joins the 2-for", () => {
  const pricing = getCartPricing([rod("specialty", 4, 4, false)], PRICES);
  const pretzel = pricing.groups.find((g) => g.key === "pretzel");
  assert.equal(pretzel.singleCount, 0);
  assert.equal(pretzel.potentialSavings, 0);
  assert.equal(pricing.subtotal, 16);
});

test("converting one group leaves the other alone", () => {
  const cart = [rod("sprinkle", 2), pop("cookie-monster", 4)];
  const { items, packCount } = buildBundlesFromSingles(cart, PRICES, "pretzel");

  assert.equal(packCount, 1);
  const pack = items.find((i) => i.key.startsWith("box-2p-"));
  assert.equal(pack.price, 5);
  assert.equal(pack.qty, 1);
  // The cake pops are untouched, still four loose singles.
  const pops = items.find((i) => i.key === "cookie-monster");
  assert.equal(pops.qty, 4);
  assert.equal(pops.price, 3);
});

test("an odd rod is left as a single rather than half a pair", () => {
  const { items, packCount } = buildBundlesFromSingles([rod("sprinkle", 3)], PRICES, "pretzel");
  assert.equal(packCount, 1);
  assert.equal(items.find((i) => i.key.startsWith("box-2p-")).qty, 1);
  assert.equal(items.find((i) => i.key === "sprinkle").qty, 1);
});

test("carts saved before pretzel rods existed still bundle as cake pops", () => {
  const legacy = [{ key: "cookie-monster", name: "Cookie Monster", qty: 4, price: 3, bundleEligible: true }];
  const pricing = getCartPricing(legacy, PRICES);
  assert.equal(pricing.suggestedFourPacks, 1);
  assert.equal(pricing.potentialSavings, 2);
  assert.equal(buildFourPacksFromSingles(legacy, PRICES).packCount, 1);
});

test("bundle prices fall back rather than pricing a bundle at zero", () => {
  assert.deepEqual(bundlePrices("pretzel", {}), { single: 3, pack: 5 });
  assert.deepEqual(bundlePrices("pretzel", { pretzelRodPrice: 0, pretzelPairPrice: -1 }), { single: 3, pack: 5 });
});

// The server rebuilds every price from the menu, so a tampered pair still costs
// what the owner set and cannot be filled with the wrong kind of product.
const MENU = [
  { slug: "sprinkle-pretzel-rod", name: "Sprinkle Pretzel Rod", blurb: "", price: 3, active: true,
    bundleEligible: true, category: "pretzel-rods", stockQuantity: null, lowStockThreshold: 3 },
  { slug: "specialty-pretzel-rod", name: "Specialty Pretzel Rod", blurb: "", price: 4, active: true,
    bundleEligible: false, category: "pretzel-rods", stockQuantity: null, lowStockThreshold: 3 },
  { slug: "cookie-monster", name: "Cookie Monster", blurb: "", price: 3, active: true,
    bundleEligible: true, category: "everyday", stockQuantity: null, lowStockThreshold: 3 },
];

test("a 2-pack is rebuilt at the owner's price, whatever the browser claims", () => {
  const [item] = normalizeOrderItems(
    [{ key: "box-2p-sprinkle-pretzel-rod", qty: 1, price: 0.01, flavors: [{ slug: "sprinkle-pretzel-rod", qty: 2 }] }],
    MENU, { pretzelPairPrice: 5 }
  );
  assert.equal(item.price, 5);
  assert.equal(item.name, "Pretzel Rod 2-Pack (2 pc)");
});

test("a 2-pack cannot be stuffed with cake pops or specialty rods", () => {
  for (const flavors of [
    [{ slug: "cookie-monster", qty: 2 }],
    [{ slug: "specialty-pretzel-rod", qty: 2 }],
    [{ slug: "sprinkle-pretzel-rod", qty: 4 }],
  ]) {
    assert.throws(() => normalizeOrderItems(
      [{ key: "box-2p-sprinkle-pretzel-rod", qty: 1, flavors }], MENU, { pretzelPairPrice: 5 }
    ));
  }
});

test("a single rod carries its category through to the order", () => {
  const [item] = normalizeOrderItems([{ key: "sprinkle-pretzel-rod", qty: 2 }], MENU, {});
  assert.equal(item.bundleGroup, "pretzel");
  assert.equal(item.price, 3);
});

// --- the two kinds must never share a bundle ---

test("a four-pack cannot be built from pretzel rods", () => {
  for (const flavors of [
    [{ slug: "sprinkle-pretzel-rod", qty: 4 }],
    [{ slug: "cookie-monster", qty: 2 }, { slug: "sprinkle-pretzel-rod", qty: 2 }],
  ]) {
    assert.throws(() => normalizeOrderItems(
      [{ key: "box-4-cookie-monster", qty: 1, flavors }], MENU, { fourPackPrice: 10 }
    ), /remove this four-pack/);
  }
});

test("a four-pack of cake pops still builds", () => {
  const [item] = normalizeOrderItems(
    [{ key: "box-4-cookie-monster", qty: 1, flavors: [{ slug: "cookie-monster", qty: 4 }] }],
    MENU, { fourPackPrice: 10 }
  );
  assert.equal(item.price, 10);
  assert.equal(item.name, "Cake Pop Four-Pack (4 pc)");
});

test("two cake pops cost two singles - the 2-for is a pretzel deal only", () => {
  const pricing = getCartPricing([pop("cookie-monster", 2)], PRICES);
  assert.equal(pricing.subtotal, 6);
  assert.equal(pricing.bundleSavings, 0);
  for (const group of pricing.groups) assert.equal(group.suggestedPacks, 0);
});

test("two pretzel rods do get the pair price", () => {
  const pricing = getCartPricing([rod("sprinkle", 2)], PRICES);
  assert.equal(pricing.subtotal, 6);
  const pretzel = pricing.groups.find((g) => g.key === "pretzel");
  assert.equal(pretzel.suggestedPacks, 1);
  assert.equal(pretzel.potentialSavings, 1);
});

test("mixed singles never combine into one bundle", () => {
  // Three of each: each shelf bundles on its own terms and neither borrows
  // from the other, so this is one four-pack short and one pair strong.
  const pricing = getCartPricing([pop("cookie-monster", 3), rod("sprinkle", 3)], PRICES);
  const cakepop = pricing.groups.find((g) => g.key === "cakepop");
  const pretzel = pricing.groups.find((g) => g.key === "pretzel");
  assert.equal(cakepop.suggestedPacks, 0);
  assert.equal(pretzel.suggestedPacks, 1);
  assert.equal(pricing.subtotal, 18);
});

test("the Box of the Week refuses a pretzel rod", () => {
  const products = [
    { slug: "cookie-monster", name: "Cookie Monster", category: "everyday" },
    { slug: "sprinkle-pretzel-rod", name: "Sprinkle Pretzel Rod", category: "pretzel-rods" },
  ];
  assert.doesNotThrow(() => assertBoxItemsAreCakePops(
    [{ slug: "cookie-monster", name: "Cookie Monster", qty: 10 }], products));
  assert.throws(() => assertBoxItemsAreCakePops(
    [{ slug: "sprinkle-pretzel-rod", name: "Sprinkle Pretzel Rod", qty: 2 }], products),
    /cannot go in the Box of the Week/);
  // A slug that is not on the menu at all is refused rather than trusted.
  assert.throws(() => assertBoxItemsAreCakePops(
    [{ slug: "not-a-flavor", name: "Made up", qty: 1 }], products), /no longer on the menu/);
});
