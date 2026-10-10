import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { randomInt } from "node:crypto";
import { normalizeCouponCode, validateCouponBatch, validatePhysicalRedemption, toCoupon, couponStatus, generateCouponCodes } from "../lib/coupons.js";
import { normalizeOrderItems } from "../lib/order-menu.js";
import { getCartPricing } from "../lib/pricing.js";
import { isEmail, isPhone } from "../lib/format.js";
import { ordersToRows, ORDER_EXPORT_COLUMNS } from "../lib/order-import.js";

async function isolated(file, imports) {
  const context = vm.createContext({ Response, Request, URL, console: { error() {} }, process: { env: { NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: "https://shop.example" } } });
  const module = new vm.SourceTextModule(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), { context });
  await module.link(specifier => {
    const values = imports[specifier]; assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(values), function () {
      Object.entries(values).forEach(([key, value]) => this.setExport(key, value));
    }, { context });
  });
  await module.evaluate(); return module.namespace;
}
const settings = { singlePopPrice: 4, fourPackPrice: 10, pretzelSinglePrice: 2, pretzelPackPrice: 3 };
const products = [{ slug: "biscoff", name: "Biscoff", blurb: "Cake pop", price: 4, active: true, bundleEligible: true }];
const items = [{ key: "biscoff", name: "Fake product", price: 0.01, qty: 2 }];
const uuid = "e345c943-a42b-4cf8-8ab7-f26998ef4d98";
const request = body => new Request("http://localhost/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const sharedImports = {
  "next/server": { NextResponse: Response },
  "@/lib/coupons": { normalizeCouponCode, validateCouponBatch, validatePhysicalRedemption, toCoupon, generateCouponCodes },
  "@/lib/products": { getProducts: async () => products },
  "@/lib/weekly-box-data": { getShopSettings: async () => settings, getFeaturedWeeklyBox: async () => null },
  "@/lib/order-menu": { normalizeOrderItems }, "@/lib/pricing": { getCartPricing },
};

test("single-use defaults and shared limits; validate money, dates, and code batches", () => {
  const single = validateCouponBatch({ name: "Market", discountAmount: "1" });
  assert.equal(single.maxRedemptions, 1); assert.equal(single.quantity, 1);
  assert.equal(validateCouponBatch({ name: "Market", discountAmount: 1, maxRedemptions: 200, code: " sweet-1 " }).code, "SWEET-1");
  for (const input of [ { discountAmount: 0 }, { discountAmount: 1.001 }, { quantity: 201 }, { quantity: 1.5 }, { maxRedemptions: 0 }, { expiresOn: "2026-02-31" }, { quantity: 2, code: "SWEET-1" }, { minimumSubtotal: -1 } ]) {
    assert.throws(() => validateCouponBatch({ name: "Market", discountAmount: 1, ...input }));
  }
  assert.throws(() => normalizeCouponCode("<script>"));
  assert.throws(() => normalizeCouponCode("A".repeat(33)));
  assert.equal(normalizeCouponCode(" bb-1234 "), "BB-1234");
  assert.equal(normalizeCouponCode(" k7m 4qx "), "K7M4QX");
});

test("availability includes expiration day, limits, and disabled codes", () => {
  const coupon = { active: true, maxRedemptions: 1, redemptionCount: 0, expiresOn: "2026-10-10" };
  assert.equal(couponStatus(coupon, "2026-10-10"), "Available");
  assert.equal(couponStatus(coupon, "2026-10-11"), "Expired");
  assert.equal(couponStatus({ ...coupon, redemptionCount: 1 }, "2026-10-10"), "Redeemed");
  assert.equal(couponStatus({ ...coupon, active: false }, "2026-10-10"), "Disabled");
});

test("preview ignores browser prices and uses current menu subtotal", async () => {
  const calls = [];
  const route = await isolated("app/api/coupons/validate/route.js", { ...sharedImports, "@/lib/supabase-data": { callBonbonsAdmin: async (action, payload) => { calls.push({ action, payload }); return { code: payload.code, originalSubtotal: payload.subtotal, discountAmount: 1, subtotal: payload.subtotal - 1 }; } } });
  const res = await route.POST(request({ code: "save-1", items, subtotal: 999, discountAmount: 999 }));
  assert.equal(res.status, 200); assert.equal((await res.json()).coupon.subtotal, 7);
  assert.equal(calls[0].action, "coupon_preview"); assert.equal(calls[0].payload.subtotal, 8);
  assert.equal(calls[0].payload.code, "SAVE-1"); assert.equal(res.headers.get("cache-control"), "no-store");
});

test("invalid or unavailable items cannot preview a coupon", async () => {
  let called = false;
  const route = await isolated("app/api/coupons/validate/route.js", { ...sharedImports, "@/lib/supabase-data": { callBonbonsAdmin: async () => { called = true; } } });
  const res = await route.POST(request({ code: "SAVE-1", items: [{ key: "missing", qty: 1 }] }));
  assert.equal(res.status, 400); assert.equal(called, false);
});

async function orderHarness({ replayed = false, rejected = false, captcha = true } = {}) {
  const calls = [];
  const route = await isolated("app/api/orders/route.js", {
    ...sharedImports, "@/lib/auth": { isAdmin: async () => false }, "@/lib/format": { isEmail, isPhone },
    "@/lib/order-tracking": { CASH_AT_PICKUP: "cash_at_pickup" },
    "@/lib/recaptcha-actions": { RECAPTCHA_ACTIONS: { order: "submit_pickup_order" } },
    "@/lib/recaptcha": { verifyRecaptcha: async () => ({ ok: captcha }) },
    "@/lib/pickup-receipt": { sendPickupReceipt: async record => { calls.push({ action: "email", record }); return { sent: true }; } },
    "@/lib/supabase-data": {
      hasSupabaseDatabase: () => true,
      orderToRow: doc => ({ items: doc.items, subtotal: doc.subtotal, customer_name: doc.customer.name, customer_email: doc.customer.email }),
      toOrder: row => ({ ...row, subtotalBeforeDiscount: row.subtotal_before_discount, discountAmount: row.discount_amount, couponCode: row.coupon_code }),
      callSupabaseData: async () => { throw new Error("Must save coupon and order atomically"); },
      callBonbonsAdmin: async (action, payload) => {
        calls.push({ action, payload });
        if (rejected) throw Object.assign(new Error("This coupon code is invalid or no longer available."), { status: 400 });
        return { data: { id: 42, subtotal: 7, subtotal_before_discount: 8, discount_amount: 1, coupon_code: payload.code, payment_status: payload.payment_choice === "cash" ? "cash_at_pickup" : "not_arranged" }, replayed };
      },
    },
  });
  const body = { items, customer: { name: "Test Customer", email: "test@example.invalid", phone: "2105550100" }, wantedDate: "2026-10-15", recaptchaToken: "unit-test", couponCode: "save-1", couponRequestId: uuid, paymentChoice: "cash", discountAmount: 999, subtotal: 0 };
  return { route, calls, body };
}

test("redemption trusts server pricing, saves cash choice atomically, and emails net total", async () => {
  const { route, calls, body } = await orderHarness();
  const res = await route.POST(request(body)); const data = await res.json();
  assert.equal(res.status, 200); assert.equal(data.subtotal, 7); assert.equal(data.discountAmount, 1);
  assert.equal(data.couponCode, "SAVE-1"); assert.equal(data.cashChoiceSaved, true);
  assert.equal(calls[0].action, "coupon_order"); assert.equal(calls[0].payload.order.subtotal, 8);
  assert.equal(calls[0].payload.request_id, uuid); assert.equal(calls[1].record.subtotal, 7);
  assert.equal(calls.length, 2);
});

test("retry returns the saved order without sending another receipt", async () => {
  const { route, calls, body } = await orderHarness({ replayed: true });
  const res = await route.POST(request(body)); const data = await res.json();
  assert.equal(res.status, 200); assert.match(data.message, /already received/);
  assert.equal(calls.length, 1);
});

test("exhausted coupon cannot create a request or send a receipt", async () => {
  const { route, calls, body } = await orderHarness({ rejected: true });
  const res = await route.POST(request(body)); assert.equal(res.status, 400);
  assert.match((await res.json()).error, /no longer available/); assert.equal(calls.length, 1);
});

test("redemption requires CAPTCHA and a valid retry ID", async () => {
  for (const invalidCaptcha of [true, false]) {
    const { route, calls, body } = await orderHarness({ captcha: !invalidCaptcha });
    const res = await route.POST(request({ ...body, couponRequestId: invalidCaptcha ? uuid : "invalid" }));
    assert.equal(res.status, invalidCaptcha ? 403 : 400); assert.equal(calls.length, 0);
  }
});

test("admin code generation defaults to one use and produces independent printable codes", async () => {
  let captured;
  const route = await isolated("app/api/admin/coupons/route.js", {
    ...sharedImports, "node:crypto": { randomInt },
    "@/lib/admin-menu": { menuGuard: async () => null, menuError: error => Response.json({ error: error.message }, { status: 400 }) },
    "@/lib/supabase-data": { callBonbonsAdmin: async (action, payload) => { captured = { action, payload }; return payload.codes.map((code, index) => ({ id: index, code, name: payload.name, discount_amount: payload.discount_amount, minimum_subtotal: 0, max_redemptions: payload.max_redemptions, redemption_count: 0, active: true })); } },
  });
  const res = await route.POST(request({ name: "Handouts", discountAmount: 1, quantity: 10 })); const data = await res.json();
  assert.equal(res.status, 201); assert.equal(data.coupons.length, 10);
  assert.equal(captured.payload.max_redemptions, 1); assert.equal(new Set(captured.payload.codes).size, 10);
  assert.ok(captured.payload.codes.every(code => /^[2-9A-HJKMNP-Z]{6}$/.test(code)));
  assert.ok(captured.payload.codes.every(code => normalizeCouponCode(code) === code));
});

test("a code collision draws a fresh batch; a custom code collision is reported", async () => {
  const attempts = [];
  const taken = Object.assign(new Error("That coupon code already exists. Choose a different code."), { status: 409 });
  const route = await isolated("app/api/admin/coupons/route.js", {
    ...sharedImports, "node:crypto": { randomInt },
    "@/lib/admin-menu": { menuGuard: async () => null, menuError: error => Response.json({ error: error.message }, { status: error.status || 400 }) },
    "@/lib/supabase-data": { callBonbonsAdmin: async (action, payload) => { attempts.push(payload.codes); if (attempts.length === 1 || payload.codes[0] === "TAKEN") throw taken; return payload.codes.map((code, id) => ({ id, code, name: payload.name, discount_amount: 1, minimum_subtotal: 0, max_redemptions: 1, redemption_count: 0, active: true })); } },
  });
  assert.equal((await route.POST(request({ name: "Handouts", discountAmount: 1, quantity: 3 }))).status, 201);
  assert.equal(attempts.length, 2); assert.notDeepEqual(attempts[0], attempts[1]);
  attempts.length = 1;
  assert.equal((await route.POST(request({ name: "Handouts", discountAmount: 1, code: "taken" }))).status, 409);
  assert.equal(attempts.length, 2);
});

test("generated codes are unique within a batch", () => {
  let n = 0; const repeating = () => [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1][n++ % 12];
  assert.deepEqual(generateCouponCodes(2, repeating), ["222222", "333333"]);
});

test("admins delete selected coupons by id; bad selections never reach the database", async () => {
  const calls = [];
  const route = await isolated("app/api/admin/coupons/route.js", {
    ...sharedImports, "node:crypto": { randomInt },
    "@/lib/admin-menu": { menuGuard: async () => null, menuError: error => Response.json({ error: error.message }, { status: error.status || 400 }) },
    "@/lib/supabase-data": { callBonbonsAdmin: async (action, payload) => { calls.push({ action, payload }); return payload.ids; } },
  });
  const del = body => route.DELETE(new Request("http://localhost/api/admin/coupons", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }));
  const res = await del({ ids: ["7", 8] });
  assert.equal(res.status, 200); assert.deepEqual((await res.json()).deleted, ["7", "8"]);
  assert.equal(JSON.stringify(calls), JSON.stringify([{ action: "coupon_delete", payload: { ids: ["7", "8"] } }]));
  for (const body of [{}, { ids: [] }, { ids: ["7; drop"] }, { ids: "7" }]) assert.equal((await del(body)).status, 400);
  assert.equal(calls.length, 1);
});

test("unauthorized admins cannot list, generate, or delete codes", async () => {
  let called = false;
  const route = await isolated("app/api/admin/coupons/route.js", {
    ...sharedImports, "node:crypto": { randomInt },
    "@/lib/admin-menu": { menuGuard: async () => Response.json({ error: "Not authorized" }, { status: 401 }), menuError: () => {} },
    "@/lib/supabase-data": { callBonbonsAdmin: async () => { called = true; } },
  });
  assert.equal((await route.GET(request({}))).status, 401);
  assert.equal((await route.POST(request({}))).status, 401);
  assert.equal((await route.DELETE(request({ ids: ["7"] }))).status, 401); assert.equal(called, false);
});

test("order exports preserve coupon code, amount, and original subtotal", () => {
  const row = ordersToRows([{ couponCode: "SAVE-1", discountAmount: 1, subtotalBeforeDiscount: 8, subtotal: 7 }])[0];
  assert.equal(row.length, ORDER_EXPORT_COLUMNS.length);
  assert.deepEqual(row.slice(-3), ["SAVE-1", "$1.00", "$8.00"]);
});

test("admin guard accepts equivalent loopback origins but rejects foreign sites and ports", async () => {
  const guard = await isolated("lib/admin-menu.js", {
    "server-only": {}, "next/server": { NextResponse: Response }, "next/cache": { revalidatePath() {}, revalidateTag() {} },
    "./auth": { isAdmin: async () => true }, "./supabase-data": { hasSupabaseDatabase: () => true }, "./weekly-box": { SHOP_SETTINGS_TAG: "settings" },
  });
  const check = headers => guard.menuGuard(new Request("http://localhost:3011/api/admin/coupons", { method: "POST", headers }), true);
  assert.equal(await check({ origin: "http://127.0.0.1:3011", "sec-fetch-site": "same-origin" }), null);
  assert.equal((await check({ origin: "http://127.0.0.1:3000" })).status, 403);
  assert.equal((await check({ origin: "https://evil.example" })).status, 403);
  assert.equal((await check({ origin: "http://127.0.0.1:3011", "sec-fetch-site": "cross-site" })).status, 403);
});

test("physical redemption normalizes the customer and validates currency and retry identity", () => {
  const good = { code: " save-1 ", customerEmail: " Person@Example.com ", subtotal: "4.00", requestId: uuid };
  assert.deepEqual(validatePhysicalRedemption(good), { code: "SAVE-1", customer_email: "person@example.com", customer_name: "", subtotal: 4, request_id: uuid });
  for (const change of [{ subtotal: 0 }, { subtotal: -2 }, { subtotal: 1.001 }, { subtotal: "" }, { customerEmail: "bad" }, { requestId: "bad" }]) assert.throws(() => validatePhysicalRedemption({ ...good, ...change }));
});

async function physicalHarness({ admin = false, captcha = { ok: true }, blocked = null, rejection = null } = {}) {
  const calls = [];
  const route = await isolated(admin ? "app/api/admin/coupons/redeem/route.js" : "app/api/coupons/redeem/route.js", {
    ...sharedImports,
    "@/lib/admin-menu": { menuGuard: async (_request, mutation) => { calls.push({ guard: mutation }); return blocked; }, menuError: error => Response.json({ error: error.message }, { status: error.status || 400 }) },
    "@/lib/recaptcha-actions": { RECAPTCHA_ACTIONS: { coupon: "redeem_coupon" } },
    "@/lib/recaptcha": { verifyRecaptcha: async input => { calls.push({ captchaAction: input.expectedAction }); return captcha; } },
    "@/lib/supabase-data": { callBonbonsAdmin: async (action, payload) => { calls.push({ action, payload }); if (rejection) throw rejection; return { code: payload?.code, discountAmount: 1, replayed: false }; } },
  });
  return { route, calls, body: { code: "save-1", customerEmail: "person@example.com", subtotal: 4, requestId: uuid, ready: true, recaptchaToken: "test" } };
}

test("customer physical redemption requires CAPTCHA, explicit readiness, and a server-selected channel", async () => {
  const { route, calls, body } = await physicalHarness();
  const res = await route.POST(request({ ...body, channel: "admin", discountAmount: 999 }));
  assert.equal(res.status, 200); assert.equal(res.headers.get("cache-control"), "no-store");
  assert.equal(calls[0].captchaAction, "redeem_coupon"); assert.equal(calls[1].action, "coupon_redeem");
  assert.equal(calls[1].payload.channel, "customer"); assert.equal(calls[1].payload.subtotal, 4);
  assert.equal(calls[1].payload.discountAmount, undefined);
  const another = await physicalHarness();
  assert.equal((await another.route.POST(request({ ...another.body, ready: false }))).status, 400);
  assert.equal(another.calls.length, 0);
});

test("failed or unavailable CAPTCHA never consumes a physical coupon", async () => {
  for (const captcha of [{ ok: false }, { ok: false, unavailable: true }]) {
    const { route, calls, body } = await physicalHarness({ captcha });
    assert.equal((await route.POST(request(body))).status, captcha.unavailable ? 503 : 403);
    assert.equal(calls.length, 1); assert.equal(calls[0].captchaAction, "redeem_coupon");
  }
});

test("staff redemption and history require admin authorization; mutations use origin guard", async () => {
  const { route, calls, body } = await physicalHarness({ admin: true });
  const res = await route.POST(request({ ...body, channel: "customer" }));
  assert.equal(res.status, 200); assert.equal(calls[0].guard, true);
  assert.equal(calls[1].payload.channel, "admin");
  const denied = await physicalHarness({ admin: true, blocked: Response.json({ error: "Denied" }, { status: 401 }) });
  assert.equal((await denied.route.POST(request(denied.body))).status, 401);
  assert.equal((await denied.route.GET(request({}))).status, 401);
  assert.equal(denied.calls.length, 2); assert.ok(denied.calls.every(call => "guard" in call));
});

test("exhausted physical coupons surface the database rejection without granting a discount", async () => {
  const rejection = Object.assign(new Error("This coupon code is invalid or no longer available."), { status: 400 });
  const { route, body } = await physicalHarness({ rejection });
  const res = await route.POST(request(body)); assert.equal(res.status, 400);
  assert.match((await res.json()).error, /no longer available/);
});
