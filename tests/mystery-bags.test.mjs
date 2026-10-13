import test from "node:test";
import assert from "node:assert/strict";
import {
  MYSTERY_BAG_TEMPLATE,
  bagContents,
  sellingContainer,
  syncMysteryBagCopy,
} from "../lib/product-offerings.js";
import { validateMenuProduct } from "../supabase/functions/_shared/menu.js";
import { saleDescription } from "../lib/menu-categories.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import {
  buildBundlesFromSingles,
  getCartPricing,
  hydrateCartItems,
} from "../lib/pricing.js";
import { assertBundleSelection } from "../lib/bundles.js";

const bag = {
  slug: MYSTERY_BAG_TEMPLATE.slug,
  name: MYSTERY_BAG_TEMPLATE.name,
  price: 10,
  unitCount: 4,
  unitLabel: "cake pops",
  offeringType: "mystery-bag",
  bonusDescription: "a sweet surprise",
  bundleEligible: false,
  category: "mystery-bags",
  treatType: "other",
  active: true,
  stockQuantity: 4,
};

test("flyer starter distinguishes four cake pops from the extra surprise and starts hidden", () => {
  const saved = validateMenuProduct(MYSTERY_BAG_TEMPLATE);
  assert.equal(saved.unit, "per bag");
  assert.equal(saved.price, 10);
  assert.equal(saved.stock_quantity, 4);
  assert.equal(saved.active, false);
  assert.equal(bagContents(bag), "4 cake pops + a sweet surprise");
  assert.equal(sellingContainer(bag), "bag");
});

test("a bag needs its own counted stock and cannot join treat discounts", () => {
  for (const change of [
    { stock_quantity: null },
    { stock_quantity: "" },
    { stock_quantity: -1 },
    { stock_quantity: 1.5 },
    { bundle_eligible: true },
    { offering_type: "other" },
    { bonus_description: "x".repeat(161) },
  ]) {
    assert.throws(() =>
      validateMenuProduct({ ...MYSTERY_BAG_TEMPLATE, ...change }),
    );
  }
  assert.equal(
    validateMenuProduct({ ...MYSTERY_BAG_TEMPLATE, stock_quantity: 0 })
      .stock_quantity,
    0,
  );
  assert.equal(
    validateMenuProduct({ ...MYSTERY_BAG_TEMPLATE, unit_count: 1 }).unit,
    "per bag",
  );
});

test("a bag can have an optional bonus and a different quantity or treat label", () => {
  const saved = validateMenuProduct({
    ...MYSTERY_BAG_TEMPLATE,
    unit_count: 6,
    unit_label: "assorted treats",
    bonus_description: "",
    price: 15,
  });
  assert.equal(bagContents(saved), "6 assorted treats");
  assert.equal(saved.price, 15);
  const standard = validateMenuProduct({
    ...MYSTERY_BAG_TEMPLATE,
    offering_type: "standard",
  });
  assert.equal(standard.bonus_description, "");
});

test("changing the starter promise updates its public copy and preserves custom wording", () => {
  const updated = syncMysteryBagCopy(MYSTERY_BAG_TEMPLATE, {
    ...MYSTERY_BAG_TEMPLATE,
    unit_count: 6,
    unit_label: "assorted treats",
    bonus_description: "a cookie",
  });
  assert.equal(updated.blurb, "Includes 6 assorted treats and a cookie!");
  assert.equal(updated.name, "Mystery 6 Pack Bags");
  assert.match(updated.description, /6 assorted treats and a cookie/);
  const custom = { ...MYSTERY_BAG_TEMPLATE, blurb: "A birthday surprise" };
  assert.equal(
    syncMysteryBagCopy(custom, { ...custom, unit_count: 6 }).blurb,
    custom.blurb,
  );
});

test("checkout trusts saved bag price and promise, and counts quantities as bags", () => {
  const [item] = normalizeOrderItems(
    [
      {
        key: bag.slug,
        qty: 2,
        price: 1,
        unitCount: 1,
        bonusDescription: "forged",
      },
    ],
    [bag],
  );
  assert.equal(item.price, 10);
  assert.equal(item.qty, 2);
  assert.equal(item.unitCount, 4);
  assert.equal(item.bonusDescription, bag.bonusDescription);
  assert.equal(
    item.description,
    "Mystery bag · 4 cake pops + a sweet surprise · assortment chosen by Bon Bon",
  );
  assert.equal(getCartPricing([item]).subtotal, 20);
  assert.throws(
    () => normalizeOrderItems([{ key: bag.slug, qty: 5 }], [bag]),
    /available|left/i,
  );
  assert.throws(
    () =>
      normalizeOrderItems(
        [{ key: bag.slug, qty: 1 }],
        [{ ...bag, stockQuantity: 0 }],
      ),
    /sold out|available/i,
  );
  assert.throws(() =>
    normalizeOrderItems(
      [{ key: bag.slug, qty: 1 }],
      [{ ...bag, active: false }],
    ),
  );
});

test("bags stay at their own price even when a saved cart claims individual eligibility", () => {
  const hydrated = hydrateCartItems(
    [
      {
        key: bag.slug,
        qty: 4,
        price: 1,
        unitCount: 1,
        bundleEligible: true,
        offeringType: "standard",
      },
    ],
    [bag],
  );
  assert.equal(hydrated[0].offeringType, "mystery-bag");
  assert.equal(hydrated[0].desc, saleDescription(bag));
  assert.equal(getCartPricing(hydrated).subtotal, 40);
  const conversion = buildBundlesFromSingles(hydrated, {}, "mixed");
  assert.deepEqual(conversion.items, hydrated);
  assert.equal(conversion.packCount, 0);
  assert.throws(() => assertBundleSelection("mixed", [{ ...bag, qty: 4 }]));
});
