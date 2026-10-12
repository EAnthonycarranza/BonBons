import test from "node:test";
import assert from "node:assert/strict";
import { validateMenuProduct, menuSlug, isMenuImageUrl } from "../supabase/functions/_shared/menu.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import { buildFourPacksFromSingles, buildBundlesFromSingles, getCartPricing, isFourPackEligible } from "../lib/pricing.js";
import { buildOrderEmail } from "../lib/email-template.js";
import { pickupRequest, confirmedOrder } from "./fixtures/email-record.mjs";
import { SITE } from "../lib/sample-data.js";

const draft = { name: "Cookie Monster", slug: "cookie-monster", price: 3, active: false, bundle_eligible: true, sort_order: 10, allergens: [] };
const menu = [{ ...draft, blurb: "Made by Bonnie", active: true, bundleEligible: true }, { ...draft, name: "Biscoff", slug: "biscoff", active: true, bundleEligible: true }];

test("flavor names produce stable, safe URL slugs", () => {
  assert.equal(menuSlug(" Cookies & Cream! "), "cookies-and-cream");
  assert.equal(menuSlug("Crème"), "creme");
});
test("menu validation strips privileged and unknown fields", () => {
  const product = validateMenuProduct({ ...draft, id: 999, deleted_at: "x", arbitrary: true });
  // A product with no category stated belongs on the cake-pop shelf.
  assert.equal(product.category, "everyday");
  assert.equal(product.unit, "each");
  assert.equal(product.active, false);
  assert.equal(product.id, undefined);
  assert.equal(product.deleted_at, undefined);
});
test("a product can be filed under any of the shop's real categories", () => {
  for (const category of ["everyday", "pretzel-rods", "rice-crispy-treats", "dipped-oreos", "custom"]) {
    assert.equal(validateMenuProduct({ ...draft, category }).category, category);
  }
});
test("menu rejects invalid prices, visibility, names, sort order, allergens, and categories", () => {
  for (const change of [{ price: 0 }, { price: "4" }, { name: "" }, { slug: "../escape" }, { active: "true" }, { bundle_eligible: 1 }, { sort_order: -1 }, { sort_order: 0.5 }, { allergens: ["unknown"] }, { description: "x".repeat(2001) }, { category: "events" }, { category: "" }]) {
    assert.throws(() => validateMenuProduct({ ...draft, ...change }));
  }
});
test("only safe local images and this project's public menu bucket are accepted", () => {
  assert.ok(isMenuImageUrl("/logo-transparent.png"));
  assert.ok(isMenuImageUrl("https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/menu-photos/flavors/example.png"));
  for (const image of ["javascript:alert(1)", "https://untrusted.example/image.png", "//evil.example/test.jpg", "/api/admin", "https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/private/x.png"]) {
    assert.equal(isMenuImageUrl(image), false);
    assert.throws(() => validateMenuProduct({ ...draft, image }));
  }
});
test("single prices and descriptions cannot be altered in the cart", () => {
  const [item] = normalizeOrderItems([{ key: "cookie-monster", qty: 10, price: 0.01, name: "Fake", desc: "Fake" }], menu);
  assert.equal(item.name, "Cookie Monster");
  assert.equal(item.description, "Made by Bonnie");
  assert.equal(getCartPricing([item]).subtotal, 30);
  assert.equal(getCartPricing([item]).potentialSavings, 5);
});
test("10 singles become five two-treat packs only on explicit conversion ($25)", () => {
  const singles = [{ key: "cookie-monster", name: "Cookie Monster", qty: 10, price: 3, bundleEligible: true }];
  const converted = buildBundlesFromSingles(singles,{},"cakepop");
  assert.equal(singles[0].qty, 10);
  assert.equal(converted.packCount, 5);
  assert.equal(getCartPricing(normalizeOrderItems(converted.items, menu)).subtotal, 25);
});
test("mixed pairs use current names and cost exactly $5 per pair", () => {
  const [box] = normalizeOrderItems([{ key: "box-2t-mixed", qty: 2, price: 0, flavors: [{ slug: "cookie-monster", qty: 1 }, { slug: "biscoff", qty: 1 }] }], menu);
  assert.equal(box.price, 5);
  assert.equal(box.description, "Cookie Monster x1, Biscoff x1");
  assert.equal(getCartPricing([box]).subtotal, 10);
});
test("hidden, deleted, missing, and empty menus cannot accept stale singles", () => {
  for (const products of [[], [{ ...menu[0], active: false }], [{ ...menu[0], deletedAt: "2026-09-06" }]]) {
    assert.throws(() => normalizeOrderItems([{ key: "cookie-monster", qty: 1 }], products));
  }
});
test("two-treat packs reject unavailable flavors, duplicate slots, incorrect counts and legacy unstructured content", () => {
  const variants = [undefined, [], [{ slug: "cookie-monster", qty: 3 }], [{ slug: "missing", qty: 4 }], [{ slug: "cookie-monster", qty: 2 }, { slug: "cookie-monster", qty: 2 }]];
  for (const flavors of variants) assert.throws(() => normalizeOrderItems([{ key: "box-2t-test", qty: 1, flavors }], menu));
  assert.throws(() => normalizeOrderItems([{ key: "box-2t-test", qty: 1, flavors: [{ slug: "cookie-monster", qty: 4 }] }], menu));
});
test("only integer quantities within the limit are accepted", () => {
  for (const qty of [0, -1, 51, 0.5, "2", null, NaN]) assert.throws(() => normalizeOrderItems([{ key: "cookie-monster", qty }], menu));
});
test("explicit offer exclusions are respected; existing packs stay separate", () => {
  assert.equal(isFourPackEligible({ key: "special", price: 4, bundleEligible: false }), false);
  assert.equal(getCartPricing([{ key: "special", qty: 2, price: 4, bundleEligible: false }]).potentialSavings, 0);
  for (const key of ["box-2t-mix", "box-4-old", "weekly-box-current"]) {
    assert.equal(isFourPackEligible({key,price:3,bundleEligible:true}), false);
    assert.equal(getCartPricing([{key,qty:2,price:3,bundleEligible:true}]).potentialSavings, 0);
  }
  assert.equal(validateMenuProduct({...draft,bundle_eligible:false}).bundle_eligible, false);
});
test("payment links appear only when an unpaid order has a confirmed positive total", () => {
  const email = buildOrderEmail({ record: confirmedOrder, kind: "orders", emailType: "confirmation" });
  assert.ok(email.text.includes(SITE.paymentUrl));
  assert.ok(email.html.includes("dot.cards/bonbonssweetssa"));
  for (const record of [pickupRequest, { ...confirmedOrder, confirmedTotal: 0 }, { ...confirmedOrder, paymentStatus: "paid_direct" }, { ...confirmedOrder, status: "cancelled" }]) {
    const result = buildOrderEmail({ record, kind: "orders", emailType: record === pickupRequest ? "request_received" : "status_update" });
    assert.ok(!result.html.includes("Open payment options"));
  }
});

test("ingredients are optional plain text with preserved paragraphs and a length limit",()=>{
 assert.equal(validateMenuProduct({...draft,ingredients:" Flour, sugar.\nChocolate coating. "}).ingredients,"Flour, sugar.\nChocolate coating.");
 assert.equal(validateMenuProduct(draft).ingredients,"");
 for(const ingredients of [42,[],{},"x".repeat(5001)])assert.throws(()=>validateMenuProduct({...draft,ingredients}));
});
