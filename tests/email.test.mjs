import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import nodemailer from "nodemailer";
import { buildOrderEmail, EMAIL_LOGO_CID, EMAIL_SOCIAL_CIDS } from "../lib/email-template.js";
import { money, isEmail, isPhone } from "../lib/format.js";
import { pickupRequest, confirmedOrder } from "./fixtures/email-record.mjs";
import { normalizeOrderItems } from "../lib/order-menu.js";
import { SITE } from "../lib/sample-data.js";

// Isolate server-only modules with explicit dependencies. No test can access
// live Gmail credentials, Supabase, CAPTCHA, or a real customer mailbox.
async function isolated(file, imports, env = {}) {
  const context = vm.createContext({
    process: { env, cwd: () => process.cwd() },
    console: { error() {} }, Response, Request,
  });
  const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const module = new vm.SourceTextModule(source, { context });
  const linked = new Map();
  await module.link((specifier) => {
    if (linked.has(specifier)) return linked.get(specifier);
    const values = specifier === "server-only" ? {} : imports[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    const child = new vm.SyntheticModule(Object.keys(values), function () {
      Object.entries(values).forEach(([key, value]) => this.setExport(key, value));
    }, { context });
    linked.set(specifier, child);
    return child;
  });
  await module.evaluate();
  return module.namespace;
}

test("receipt is clearly pending and preserves chosen bundles + singles ($28)", () => {
  const email = buildOrderEmail({ record: pickupRequest, kind: "orders", emailType: "request_received" });
  assert.match(email.subject, /received your pickup request/);
  assert.match(email.text, /not a confirmed order/);
  assert.match(email.text, /Estimated total: \$28/);
  assert.match(email.text, /2 × Cake Pop Four-Pack/);
  assert.match(email.text, /2 × Chocolate Drizzle Pop/);
  assert.match(email.text, /Requested date:/);
  assert.match(email.text, /No payment has been collected/);
  assert.doesNotMatch(email.html, /undefined|NaN|Order number: null/);
  assert.match(email.html, new RegExp(`cid:${EMAIL_LOGO_CID}`));
  assert.ok(Buffer.byteLength(email.html) < 50000);
});

test("confirmation has order number, explicit total and encoded Maps link", () => {
  const email = buildOrderEmail({ record: confirmedOrder, kind: "orders", emailType: "confirmation" });
  assert.match(email.subject, /BB-26-PREVIEW confirmed/);
  assert.match(email.text, /Confirmed total: \$28/);
  assert.match(email.text, /2:30 PM/);
  assert.ok(email.html.includes(encodeURIComponent(confirmedOrder.pickupLocation)));
  assert.doesNotMatch(email.html, /localhost|Awaiting owner confirmation/);
});

test("status updates preserve a zero confirmed total and paid state", () => {
  const record = { ...confirmedOrder, status: "ready", confirmedTotal: 0, paymentStatus: "paid_cash" };
  const email = buildOrderEmail({ record, kind: "orders", emailType: "status_update" });
  assert.match(email.subject, /Ready for pickup/);
  assert.match(email.text, /Confirmed total: \$0/);
  assert.match(email.text, /Payment is recorded/);
});

test("escapes customer/product/message HTML, keeps line breaks", () => {
  const record = { ...confirmedOrder, customer: { name: '<img src=x onerror="alert(1)">', email: "a@example.invalid" } };
  const email = buildOrderEmail({ record, kind: "orders", emailType: "confirmation", personalMessage: "<script>alert(1)</script>\nThanks & see you soon!" });
  assert.doesNotMatch(email.html, /<script>|<img src=x/);
  assert.match(email.html, /&lt;script&gt;/);
  assert.match(email.html, /<br>Thanks &amp;/);
});

test("confirmed quote uses the same design and valid details", () => {
  const record = { name: "Jamie", email: "a@example.invalid", status: "booked", orderNumber: "BB-26-PREVIEW", eventDate: "2026-09-12", guests: 12, colors: "Pink", interests: ["Cake pops"] };
  const email = buildOrderEmail({ record, kind: "quotes", emailType: "confirmation" });
  assert.match(email.text, /Requested quantity/);
  assert.doesNotMatch(email.html, /undefined|NaN/);
});

test("requires order number for confirmation; blocks a misleading receipt after confirmation", () => {
  assert.throws(() => buildOrderEmail({ record: pickupRequest, kind: "orders", emailType: "confirmation" }));
  assert.throws(() => buildOrderEmail({ record: confirmedOrder, kind: "orders", emailType: "request_received" }));
});

async function isolatedMailer(capture, { documentFails = false } = {}) {
  return isolated("lib/email.js", {
    nodemailer: { default: { createTransport: () => ({ sendMail: async (value) => {
      capture.options = value;
      return { accepted: [pickupRequest.customer.email], messageId: "test-id" };
    } }) } },
    "node:path": { default: path }, "./email-template.js": { buildOrderEmail, EMAIL_LOGO_CID, EMAIL_SOCIAL_CIDS },
    "./sample-data.js": { SITE },
    "./order-pdf.js": {
      buildOrderDocument: async () => {
        if (documentFails) throw new Error("Test PDF failure");
        return Buffer.from("%PDF-1.7 test");
      },
      documentFilename: () => "BonBons-Test.pdf",
    },
  }, { GMAIL_USER: "sender@example.invalid", GMAIL_APP_PASSWORD: "fake-test-only" });
}

test("SMTP message contains embedded logo, reply address, auto-message header and plain text", async () => {
  const capture = {};
  const email = await isolatedMailer(capture);
  const result = await email.sendOrderEmail({ record: pickupRequest, kind: "orders", emailType: "request_received" });
  const options = capture.options;
  assert.equal(result.messageId, "test-id");
  assert.equal(options.replyTo, SITE.email);
  assert.equal(options.to.address, pickupRequest.customer.email);
  assert.equal(options.headers["Auto-Submitted"], "auto-generated");
  assert.equal(options.attachments[0].cid, EMAIL_LOGO_CID);
  assert.equal(options.attachments.length, 4);
  assert.equal(options.attachments.slice(1).map((attachment) => attachment.cid).join(","), Object.values(EMAIL_SOCIAL_CIDS).join(","));
  for (const attachment of options.attachments) await access(attachment.path);
  await access(options.attachments[0].path);
  const mime = await nodemailer.createTransport({ streamTransport: true, buffer: true }).sendMail(options);
  const raw = mime.message.toString();
  assert.match(raw, /multipart\/related/);
  assert.match(raw, /Content-Type: image\/png/);
  assert.match(raw, /Content-Disposition: inline/);
  assert.ok(raw.includes(`Content-ID: <${EMAIL_LOGO_CID}>`));
  assert.match(raw, /Content-Type: text\/plain/);
});

async function orderRoute({ mailFails = false, saveFails = false, trackingFails = false, captchaValid = true } = {}) {
  const calls = [];
  const callSupabaseData = async (action) => {
    calls.push(action);
    if (action === "create_order" && saveFails) throw new Error("Test save failure");
    if (action === "record_email" && trackingFails) throw new Error("Test tracking failure");
    return { data: { ...pickupRequest, id: pickupRequest._id } };
  };
  const receipt = await isolated("lib/pickup-receipt.js", {
    "./email": { sendOrderEmail: async () => {
      calls.push("send-email");
      if (mailFails) throw new Error("Test SMTP failure");
      return { recipient: pickupRequest.customer.email, subject: "Receipt", messageId: "test" };
    } },
    "./supabase-data": { callSupabaseData },
  });
  const route = await isolated("app/api/orders/route.js", {
    "next/server": { NextResponse: Response }, "@/lib/auth": { isAdmin: async () => false },
    "@/lib/format": { money, isEmail, isPhone },
    "@/lib/products": { getProducts: async () => [{ slug: "chocolate-drizzle-cake-pops", name: "Chocolate Drizzle Pop", price: 4, bundleEligible: true }] },
    "@/lib/order-menu": { normalizeOrderItems },
    "@/lib/weekly-box-data": {
      getShopSettings: async () => ({ singlePopPrice: 4, fourPackPrice: 10 }),
      getFeaturedWeeklyBox: async () => null,
    },
    "@/lib/pricing": { getCartPricing: (items) => ({ subtotal: items.reduce((sum, item) => sum + item.qty * item.price, 0) }) },
    "@/lib/recaptcha-actions": { RECAPTCHA_ACTIONS: { order: "submit_pickup_order" } },
    "@/lib/recaptcha": { verifyRecaptcha: async () => ({ ok: captchaValid }) },
    "@/lib/pickup-receipt": { sendPickupReceipt: receipt.sendPickupReceipt },
    "@/lib/supabase-data": { callSupabaseData, hasSupabaseDatabase: () => true, orderToRow: (record) => record, toOrder: (record) => record },
  });
  const response = await route.POST(new Request("http://localhost/api/orders", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: pickupRequest.items, customer: pickupRequest.customer, wantedDate: pickupRequest.wantedDate, recaptchaToken: "unit-test" }),
  }));
  return { response, body: await response.json(), calls };
}

test("valid request saves first, emails once, then logs receipt", async () => {
  const { response, body, calls } = await orderRoute();
  assert.equal(response.status, 200);
  assert.equal(body.receiptEmailSent, true);
  assert.equal(body.subtotal, 28);
  assert.deepEqual(calls, ["create_order", "send-email", "record_email"]);
});

test("SMTP failure still returns saved success and tracks receipt failure", async () => {
  const { response, body, calls } = await orderRoute({ mailFails: true });
  assert.equal(response.status, 200);
  assert.equal(body.stored, true);
  assert.equal(body.receiptEmailSent, false);
  assert.match(body.message, /don't submit it again/);
  assert.deepEqual(calls, ["create_order", "send-email", "record_receipt_failure"]);
});

test("tracking failure cannot resend email or fail the saved request", async () => {
  const { response, body, calls } = await orderRoute({ trackingFails: true });
  assert.equal(response.status, 200);
  assert.equal(body.receiptEmailSent, true);
  assert.equal(calls.filter((action) => action === "send-email").length, 1);
});

test("save failure never sends email", async () => {
  const { response, calls } = await orderRoute({ saveFails: true });
  assert.equal(response.status, 500);
  assert.deepEqual(calls, ["create_order"]);
});

test("failed CAPTCHA cannot save a request or send an email", async () => {
  const { response, calls } = await orderRoute({ captchaValid: false });
  assert.equal(response.status, 403);
  assert.deepEqual(calls, []);
});

test("confirmations and paid invoices carry a PDF; other emails do not", async () => {
  const confirmed = { ...confirmedOrder, paymentStatus: "paid_cash" };

  for (const emailType of ["confirmation", "paid_invoice"]) {
    const capture = {};
    const email = await isolatedMailer(capture);
    const result = await email.sendOrderEmail({ record: confirmed, kind: "orders", emailType });
    const pdf = capture.options.attachments.find((item) => item.contentType === "application/pdf");
    assert.ok(pdf, `${emailType} should attach a PDF`);
    assert.equal(pdf.filename, "BonBons-Test.pdf");
    assert.equal(result.documentAttached, true);
  }

  // A receipt and a status update are informational; nothing to file away.
  for (const [record, emailType] of [[pickupRequest, "request_received"], [confirmed, "status_update"]]) {
    const capture = {};
    const email = await isolatedMailer(capture);
    const result = await email.sendOrderEmail({ record, kind: "orders", emailType });
    assert.equal(capture.options.attachments.some((item) => item.contentType === "application/pdf"), false);
    assert.equal(result.documentAttached, false);
  }
});

test("a PDF that cannot be built still lets the email go out", async () => {
  const capture = {};
  const email = await isolatedMailer(capture, { documentFails: true });
  const result = await email.sendOrderEmail({
    record: { ...confirmedOrder, paymentStatus: "paid_cash" }, kind: "orders", emailType: "paid_invoice",
  });
  // The customer is better served by the message without its attachment than
  // by no message at all.
  assert.equal(result.messageId, "test-id");
  assert.equal(result.documentAttached, false);
  assert.equal(capture.options.attachments.some((item) => item.contentType === "application/pdf"), false);
});
