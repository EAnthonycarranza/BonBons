import test from "node:test";
import assert from "node:assert/strict";
import { orderActionToken, orderTokenMatches, paymentChoiceUrl } from "../lib/order-links.js";
import { PAYMENT_STATUS_VALUES, PAID_STATUSES, isPaidStatus, CASH_AT_PICKUP } from "../lib/order-tracking.js";

const SECRET = "test-secret-that-is-long-enough-for-hmac-1234";

test("cash_at_pickup is a payment status but never counts as paid", () => {
  assert.ok(PAYMENT_STATUS_VALUES.includes(CASH_AT_PICKUP));
  assert.equal(isPaidStatus(CASH_AT_PICKUP), false);
  assert.deepEqual(PAID_STATUSES, ["paid_cash", "paid_direct"]);
});

test("token is deterministic per order and secret, and verifies", () => {
  const a = orderActionToken("1042", SECRET);
  const b = orderActionToken("1042", SECRET);
  assert.equal(a, b);
  assert.equal(a.length, 40);
  assert.ok(orderTokenMatches("1042", a, SECRET));
});

test("token does not verify for another order, a tampered token, or another secret", () => {
  const token = orderActionToken("1042", SECRET);
  assert.equal(orderTokenMatches("1043", token, SECRET), false);
  assert.equal(orderTokenMatches("1042", token.slice(0, -1) + "0", SECRET), false);
  assert.equal(orderTokenMatches("1042", token, SECRET + "x"), false);
  assert.equal(orderTokenMatches("1042", "", SECRET), false);
});

test("no secret means no token and no link — never a link that cannot be verified", () => {
  assert.equal(orderActionToken("1042", ""), "");
  assert.equal(orderTokenMatches("1042", "anything", ""), false);
  const saved = process.env.ADMIN_SECRET;
  delete process.env.ADMIN_SECRET;
  try {
    assert.equal(paymentChoiceUrl("1042", "cash"), "");
  } finally {
    if (saved !== undefined) process.env.ADMIN_SECRET = saved;
  }
});

test("payment choice link carries the token, the choice, and the site origin", () => {
  const savedSecret = process.env.ADMIN_SECRET;
  const savedUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.ADMIN_SECRET = SECRET;
  process.env.NEXT_PUBLIC_SITE_URL = "https://bonbons.example/";
  try {
    const url = new URL(paymentChoiceUrl("1042", "cash"));
    assert.equal(url.origin, "https://bonbons.example");
    assert.equal(url.pathname, "/api/orders/1042/payment-choice");
    assert.equal(url.searchParams.get("choice"), "cash");
    assert.ok(orderTokenMatches("1042", url.searchParams.get("t"), SECRET));
  } finally {
    process.env.ADMIN_SECRET = savedSecret;
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL; else process.env.NEXT_PUBLIC_SITE_URL = savedUrl;
  }
});
