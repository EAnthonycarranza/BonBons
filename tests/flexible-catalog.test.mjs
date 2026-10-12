import test from "node:test";
import assert from "node:assert/strict";
import {
  validateMenuProduct,
  validateWeeklyBox,
  boxPopCount,
} from "../supabase/functions/_shared/menu.js";
import {
  validateCategory,
  categoryName,
  saleDescription,
} from "../lib/menu-categories.js";
import { canonicalBoxItems, assertBundleSelection } from "../lib/bundles.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import {
  getCartPricing,
  buildBundlesFromSingles,
  hydrateCartItems,
} from "../lib/pricing.js";
import { weeklyBoxDescription, weeklyBoxCartKey } from "../lib/weekly-box.js";
import { weeklyBoxPresentation } from "../lib/weekly-box-presentation.js";

const categories = [
  { slug: "cookies", name: "Cookies", treatType: "other" },
  { slug: "holiday-pops", name: "Holiday Cake Pops", treatType: "cake-pops" },
];
const draft = {
  name: "Small Chocolate Chip Cookies",
  slug: "small-cookies",
  category: "cookies",
  price: 18,
  unit_count: 12,
  unit_label: "small cookies",
  bundle_eligible: false,
  active: true,
};
const cookies = {
  slug: draft.slug,
  name: draft.name,
  category: "cookies",
  categoryLabel: "Cookies",
  treatType: "other",
  price: 18,
  unitCount: 12,
  unitLabel: "small cookies",
  bundleEligible: false,
  active: true,
  stockQuantity: 3,
  blurb: "Baked by Bon Bon",
};
const pop = {
  slug: "holiday-pop",
  name: "Holiday Pop",
  category: "holiday-pops",
  treatType: "cake-pops",
  price: 3,
  unitCount: 1,
  bundleEligible: true,
  active: true,
};
const boxDraft = {
  title: "Weekly treat selection",
  slug: "weekly-selection",
  price: 25,
  stock_quantity: 4,
  low_stock_threshold: 2,
  active: true,
  featured: true,
  items: [],
};

test("admins can save a named custom category with a stable type and safe slug", () => {
  assert.deepEqual(
    validateCategory({ name: "  Mini   Cookies ", treatType: "other" }),
    {
      name: "Mini Cookies",
      slug: "mini-cookies",
      treat_type: "other",
      sort_order: 50,
    },
  );
  assert.equal(categoryName(cookies), "Cookies");
  for (const change of [
    { name: "" },
    { name: "x".repeat(61) },
    { name: 42 },
    { name: "Cookies", slug: "../escape" },
    { name: "Cookies", treatType: "unknown" },
    { name: "Cookies", sortOrder: -1 },
  ])
    assert.throws(() => validateCategory(change));
});
test("a dozen cookies is a complete priced batch in a saved category", () => {
  const saved = validateMenuProduct(draft, categories);
  assert.equal(saved.unit_count, 12);
  assert.equal(saved.price, 18);
  assert.equal(saved.unit, "per batch of 12 small cookies");
  assert.equal(saved.bundle_eligible, false);
  assert.match(saleDescription(cookies), /Batch of 12 small cookies/);
  assert.throws(() => validateMenuProduct(draft), /saved category/);
  for (const change of [
    { unit_count: 0 },
    { unit_count: 1.5 },
    { unit_count: 1001 },
    { unit_label: 42 },
    { bundle_eligible: true },
  ])
    assert.throws(() =>
      validateMenuProduct({ ...draft, ...change }, categories),
    );
});
test("server pricing keeps a quantity of two dozen batches at the owner's price", () => {
  const normalized = normalizeOrderItems(
    [{ key: cookies.slug, qty: 2, price: 0.01, unitCount: 1, name: "Fake" }],
    [cookies],
  );
  assert.equal(normalized[0].price, 18);
  assert.equal(normalized[0].unitCount, 12);
  assert.equal(normalized[0].qty, 2);
  assert.match(normalized[0].description, /12 small cookies/);
  assert.equal(getCartPricing(normalized).subtotal, 36);
  assert.throws(
    () => normalizeOrderItems([{ key: cookies.slug, qty: 4 }], [cookies]),
    /Only 3/,
  );
});
test("batch products never become discounted pairs or four-packs", () => {
  const cart = [
    {
      key: cookies.slug,
      qty: 4,
      price: 18,
      unitCount: 12,
      bundleEligible: false,
      category: "cookies",
    },
  ];
  assert.equal(getCartPricing(cart).potentialSavings, 0);
  assert.equal(buildBundlesFromSingles(cart, {}, "mixed").packCount, 0);
  assert.throws(
    () =>
      normalizeOrderItems(
        [
          {
            key: "box-4m-forged",
            qty: 1,
            flavors: [{ slug: cookies.slug, qty: 4 }],
          },
        ],
        [cookies],
      ),
    /own price/,
  );
});
test("old carts receive authoritative batch size and offer eligibility", () => {
  const [line] = hydrateCartItems(
    [
      {
        key: cookies.slug,
        qty: 2,
        unitCount: 1,
        price: 3,
        bundleEligible: true,
      },
    ],
    [cookies],
  );
  assert.equal(line.unitCount, 12);
  assert.equal(line.price, 18);
  assert.equal(line.bundleEligible, false);
  assert.equal(getCartPricing([line]).potentialSavings, 0);
});
test("new cake-pop categories qualify for pairs by their saved treat type", () => {
  const [line] = normalizeOrderItems(
    [
      {
        key: "box-2c-new-category",
        qty: 1,
        flavors: [{ slug: pop.slug, qty: 2 }],
      },
    ],
    [pop],
  );
  assert.equal(line.price, 5);
  assert.match(line.description, /Holiday Pop/);
});
test("renamed and additional categories cannot bypass rice crispy or Oreo limits", () => {
  for (const [type, qty] of [
    ["rice-crispy-treats", 2],
    ["dipped-oreos", 3],
  ]) {
    const entries = [
      { category: "seasonal-one", treatType: type, qty: 1 },
      { category: "seasonal-two", treatType: type, qty: qty - 1 },
      { category: "everyday", qty: 4 - qty },
    ];
    assert.throws(() => assertBundleSelection("mixed", entries), /at most/);
  }
});
test("forged bundle metadata cannot change a batch or restricted treat into a cake pop", () => {
  const rice = {
    slug: "seasonal-rice",
    name: "Seasonal Rice Treat",
    category: "seasonal",
    treatType: "rice-crispy-treats",
    bundleEligible: true,
    unitCount: 1,
    price: 3,
    active: true,
  };
  const flavors = [
    { slug: rice.slug, qty: 2, category: "everyday", treatType: "cake-pops" },
    { slug: pop.slug, qty: 2 },
  ];
  assert.throws(
    () =>
      normalizeOrderItems(
        [{ key: "box-4m-forged-types", qty: 1, flavors }],
        [rice, pop],
      ),
    /at most 1/,
  );
  const batchFlavors = [
    {
      slug: cookies.slug,
      qty: 2,
      category: "everyday",
      treatType: "cake-pops",
      unitCount: 1,
      bundleEligible: true,
    },
  ];
  assert.throws(
    () =>
      normalizeOrderItems(
        [{ key: "box-2c-forged-batch", qty: 1, flavors: batchFlavors }],
        [cookies],
      ),
    /own price/,
  );
});
test("listed weekly boxes accept any saved product and snapshot batch quantities", () => {
  const items = canonicalBoxItems(
    [
      { slug: cookies.slug, name: "Fake name", qty: 1, unit_count: 1 },
      { slug: pop.slug, qty: 2 },
    ],
    [cookies, pop],
  );
  const box = validateWeeklyBox({ ...boxDraft, items });
  assert.equal(box.treat_count, 14);
  assert.equal(box.items[0].name, cookies.name);
  assert.equal(box.items[0].unit_count, 12);
  assert.equal(boxPopCount(box.items), 14);
  assert.throws(
    () => canonicalBoxItems([{ slug: "unknown" }], [cookies]),
    /no longer on the menu/,
  );
  assert.doesNotThrow(() =>
    canonicalBoxItems(
      [{ slug: cookies.slug }],
      [{ ...cookies, active: false }],
    ),
  );
});
test("mystery boxes can vary their contents or keep a matching private selection", () => {
  const variable = validateWeeklyBox({
    ...boxDraft,
    box_type: "mystery",
    treat_count: 12,
  });
  assert.equal(variable.treat_count, 12);
  assert.deepEqual(variable.items, []);
  const items = canonicalBoxItems([{ slug: cookies.slug, qty: 1 }], [cookies]);
  assert.equal(
    validateWeeklyBox({
      ...boxDraft,
      box_type: "mystery",
      treat_count: 12,
      items,
    }).treat_count,
    12,
  );
  for (const change of [
    { treat_count: 0 },
    { treat_count: 1.5 },
    { treat_count: 10001 },
    { treat_count: 6, items },
  ])
    assert.throws(() =>
      validateWeeklyBox({
        ...boxDraft,
        box_type: "mystery",
        treat_count: 12,
        ...change,
      }),
    );
});
test("mystery contents stay out of customer presentation and order descriptions", () => {
  const box = {
    slug: "mystery-week",
    title: "Mystery Week",
    boxType: "mystery",
    treatCount: 12,
    items: [
      {
        slug: cookies.slug,
        name: "Secret selected cookie",
        qty: 1,
        unit_count: 12,
      },
    ],
    price: 25,
    stockQuantity: 4,
    active: true,
  };
  const shown = weeklyBoxPresentation(box, [cookies]);
  assert.deepEqual(shown.items, []);
  assert.equal(shown.treatCount, 12);
  assert.equal(shown.flavorCount, 0);
  assert.match(weeklyBoxDescription(box), /12 assorted treats/);
  assert.ok(!weeklyBoxDescription(box).includes("Secret"));
  const [line] = normalizeOrderItems(
    [
      {
        key: weeklyBoxCartKey(box),
        qty: 1,
        description: "Reveal contents",
        price: 1,
      },
    ],
    [],
    { weeklyBox: box },
  );
  assert.equal(line.price, 25);
  assert.match(line.description, /Mystery box/);
  assert.ok(!line.description.includes("Secret"));
});
