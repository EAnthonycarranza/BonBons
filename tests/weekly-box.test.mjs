import test from "node:test";
import assert from "node:assert/strict";
import {
  stockState,
  validateMenuProduct,
  validateWeeklyBox,
  validateShopSettings,
  MenuValidationError,
} from "../supabase/functions/_shared/menu.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import { stockLabel, weeklyBoxCartKey, isWeeklyBoxKey } from "../lib/weekly-box.js";

const boxDraft = {
  title: "Celebration Box", slug: "celebration-box", price: 25, stock_quantity: 12,
  low_stock_threshold: 5, items: [{ name: "Cookie Monster", note: "Top seller" }],
  image: "", featured: true, active: true,
};

const menu = [
  { slug: "cookie-monster", name: "Cookie Monster", blurb: "A pop", price: 4, bundleEligible: true, active: true, stockQuantity: null, lowStockThreshold: 3 },
  { slug: "biscoff", name: "Biscoff", blurb: "A pop", price: 4, bundleEligible: true, active: true, stockQuantity: 6, lowStockThreshold: 3 },
  { slug: "sold-out-pop", name: "Sold Out Pop", blurb: "A pop", price: 4, bundleEligible: true, active: true, stockQuantity: 0, lowStockThreshold: 3 },
];

const liveBox = {
  slug: "celebration-box", title: "Celebration Box", price: 25, active: true,
  stockQuantity: 4, lowStockThreshold: 5, items: [{ name: "Cookie Monster", note: "" }],
};

test("untracked stock keeps made-to-order flavors always available", () => {
  for (const value of [null, undefined]) {
    const state = stockState(value);
    assert.equal(state.tracked, false);
    assert.equal(state.state, "available");
    assert.equal(stockLabel(state), "");
  }
});

test("stock states cross from available to low to sold out at the threshold", () => {
  assert.equal(stockState(10, 3).state, "available");
  assert.equal(stockState(4, 3).state, "available");
  assert.equal(stockState(3, 3).state, "low");
  assert.equal(stockState(1, 3).state, "low");
  assert.equal(stockState(0, 3).state, "sold_out");
  assert.equal(stockState(-5, 3).state, "sold_out");
  // A zero threshold means "never warn", not "always warn".
  assert.equal(stockState(1, 0).state, "available");
  assert.equal(stockLabel(stockState(1, 3)), "Only 1 left");
  assert.equal(stockLabel(stockState(3, 3)), "Only 3 left");
});

test("flavor prices are owner-set but must be real positive money", () => {
  const draft = { name: "Biscoff", slug: "biscoff", price: 6.5, active: true, bundle_eligible: true, sort_order: 0, allergens: [] };
  assert.equal(validateMenuProduct(draft).price, 6.5);
  for (const price of [0, -4, "4", 4.005, 501, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => validateMenuProduct({ ...draft, price }), MenuValidationError, `accepted ${price}`);
  }
});

test("flavor stock is optional, whole, and non-negative", () => {
  const draft = { name: "Biscoff", slug: "biscoff", price: 4, active: true, bundle_eligible: true, sort_order: 0, allergens: [] };
  assert.equal(validateMenuProduct(draft).stock_quantity, null);
  assert.equal(validateMenuProduct({ ...draft, stock_quantity: 0 }).stock_quantity, 0);
  assert.equal(validateMenuProduct({ ...draft, stock_quantity: 25 }).stock_quantity, 25);
  for (const stock of [-1, 2.5, "3", 100001]) {
    assert.throws(() => validateMenuProduct({ ...draft, stock_quantity: stock }), MenuValidationError, `accepted ${stock}`);
  }
});

test("a box needs a real count, a real price, and named items", () => {
  const clean = validateWeeklyBox(boxDraft);
  assert.equal(clean.price, 25);
  assert.equal(clean.stock_quantity, 12);
  assert.deepEqual(clean.items, [{ name: "Cookie Monster", note: "Top seller" }]);
  // A limited run must state its count, so stock is required here.
  for (const change of [{ stock_quantity: undefined }, { stock_quantity: null }, { stock_quantity: -1 }, { stock_quantity: 1.5 },
                        { price: 0 }, { title: "" }, { slug: "../escape" }, { featured: "yes" }, { active: 1 },
                        { items: [{ name: "" }] }, { items: Array.from({ length: 41 }, () => ({ name: "x" })) }]) {
    assert.throws(() => validateWeeklyBox({ ...boxDraft, ...change }), MenuValidationError, `accepted ${JSON.stringify(change)}`);
  }
});

test("box validation strips unknown and privileged fields", () => {
  const clean = validateWeeklyBox({ ...boxDraft, id: 9, created_at: "2020-01-01", sneaky: true });
  for (const key of ["id", "created_at", "sneaky"]) assert.equal(key in clean, false);
});

test("shop prices must both be positive money", () => {
  assert.deepEqual(validateShopSettings({ single_pop_price: 5, four_pack_price: 12 }), { single_pop_price: 5, four_pack_price: 12 });
  for (const change of [{ single_pop_price: 0 }, { four_pack_price: -1 }, { four_pack_price: "10" }]) {
    assert.throws(() => validateShopSettings({ single_pop_price: 4, four_pack_price: 10, ...change }), MenuValidationError);
  }
});

test("a sold-out flavor cannot be ordered even if the browser asks", () => {
  assert.throws(
    () => normalizeOrderItems([{ key: "sold-out-pop", qty: 1 }], menu),
    /sold out/i
  );
});

test("a tracked flavor cannot be over-ordered past what is left", () => {
  assert.throws(() => normalizeOrderItems([{ key: "biscoff", qty: 7 }], menu), /Only 6 .* left/i);
  assert.equal(normalizeOrderItems([{ key: "biscoff", qty: 6 }], menu)[0].qty, 6);
  // Untracked flavors are unaffected by any of this.
  assert.equal(normalizeOrderItems([{ key: "cookie-monster", qty: 50 }], menu)[0].qty, 50);
});

test("four-packs use the configured pack price and respect flavor stock", () => {
  const pack = [{ key: "box-4-mixed", qty: 1, flavors: [{ slug: "cookie-monster", qty: 2 }, { slug: "biscoff", qty: 2 }] }];
  assert.equal(normalizeOrderItems(pack, menu)[0].price, 10);
  assert.equal(normalizeOrderItems(pack, menu, { fourPackPrice: 12 })[0].price, 12);
  // Two packs need 4 Biscoff; six are left, so three packs (6) is the ceiling.
  assert.equal(normalizeOrderItems([{ ...pack[0], qty: 3 }], menu, {})[0].qty, 3);
  assert.throws(() => normalizeOrderItems([{ ...pack[0], qty: 4 }], menu, {}), /Only 6 .* left/i);
});

test("the weekly box is priced from the server and only while it is live", () => {
  const key = weeklyBoxCartKey(liveBox);
  assert.equal(isWeeklyBoxKey(key), true);
  const [line] = normalizeOrderItems([{ key, qty: 2, price: 1 }], menu, { weeklyBox: liveBox });
  assert.equal(line.price, 25);
  assert.equal(line.name, "Celebration Box");

  // No live box, a different box, an unpublished box, or more than remain.
  assert.throws(() => normalizeOrderItems([{ key, qty: 1 }], menu, {}), /no longer available/i);
  assert.throws(() => normalizeOrderItems([{ key, qty: 1 }], menu, { weeklyBox: { ...liveBox, slug: "other" } }), /no longer available/i);
  assert.throws(() => normalizeOrderItems([{ key, qty: 1 }], menu, { weeklyBox: { ...liveBox, active: false } }), /no longer available/i);
  assert.throws(() => normalizeOrderItems([{ key, qty: 5 }], menu, { weeklyBox: liveBox }), /Only 4 .* left/i);
  assert.throws(() => normalizeOrderItems([{ key, qty: 1 }], menu, { weeklyBox: { ...liveBox, stockQuantity: 0 } }), /sold out/i);
});
