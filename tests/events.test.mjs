import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { DEFAULT_EVENT_EMAIL, validateEvent, validateEventEmail, eventToRow, toEvent, eventDateLabel, eventTimeLabel, isUpcomingEvent, safeEventImage } from "../lib/events.js";
import { buildEventUpdateEmail, buildSubscriptionEmail } from "../lib/event-email.js";
import { groupCouponPromotions } from "../lib/coupons.js";
import { isEmail } from "../lib/format.js";
import { RECAPTCHA_ACTIONS } from "../lib/recaptcha-actions.js";
const event = { title: "Market <morning>", venue: "Local & lovely", address: "San Antonio TX", date: "2026-11-14", endDate: "2026-11-14", startTime: "09:00", endTime: "14:00", description: "Find us here.\nHandmade treats.", image: "", link: "", status: "published" };
const design = { ...DEFAULT_EVENT_EMAIL, eventIds: ["42"] };
async function isolated(file, imports, env = {}) {
  const context = vm.createContext({ process: { env }, console: { error() {} }, Response, Request, URL, AbortSignal });
  const module = new vm.SourceTextModule(await readFile(new URL(`../${file}`, import.meta.url), "utf8"), { context });
  await module.link(specifier => {
    const values = specifier === "server-only" ? {} : imports[specifier];
    assert.ok(values, `Unexpected dependency: ${specifier}`);
    return new vm.SyntheticModule(Object.keys(values), function () { Object.entries(values).forEach(([key, value]) => this.setExport(key, value)); }, { context });
  });
  await module.evaluate(); return module.namespace;
}
const NextResponse = { json: (body, options) => Response.json(body, options) };
const request = body => new Request("http://localhost:3011/api/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
test("promotion grouping merges canonical names and keeps generation batches distinct", () => {
  const coupons = [ { id: "1", name: " Local Market ", createdAt: "2026-10-10T10:00:00Z" }, { id: "2", name: "local   market", createdAt: "2026-10-10T10:00:00Z" }, { id: "3", name: "Local Market", createdAt: "2026-10-11T10:00:00Z" }, { id: "4", name: "Another event", createdAt: "2026-10-09T10:00:00Z" } ];
  const original = JSON.stringify(coupons), groups = groupCouponPromotions(coupons);
  assert.equal(groups.length, 2); assert.equal(groups[0].coupons.length, 3); assert.equal(groups[0].batches.length, 2);
  assert.equal(groups[0].batches[0].codes[0].id, "3"); assert.equal(JSON.stringify(coupons), original);
});
test("events preserve local calendar dates, times and multiline descriptions", () => {
  const valid = validateEvent(event), converted = toEvent({ id: 42, ...eventToRow(valid) });
  assert.equal(converted.date, "2026-11-14"); assert.match(eventDateLabel(converted), /Sat, Nov 14, 2026/);
  assert.match(eventTimeLabel(converted), /9:00 AM – 2:00 PM/);
  assert.equal(isUpcomingEvent(converted, "2026-11-14"), true); assert.equal(isUpcomingEvent(converted, "2026-11-15"), false);
  assert.equal(isUpcomingEvent({ ...converted, endDate: "2026-11-16" }, "2026-11-15"), true);
});
test("events end at their closing time, rather than at the start or next day", () => {
  const current = { ...event, date: "2026-10-10", endDate: "2026-10-10", endsAt: "2026-10-10T19:00:00Z" };
  assert.equal(isUpcomingEvent(current, "2026-10-10T14:00:00Z"), true);
  assert.equal(isUpcomingEvent(current, "2026-10-10T18:59:59Z"), true);
  assert.equal(isUpcomingEvent(current, "2026-10-10T19:00:00Z"), false);
  assert.equal(isUpcomingEvent({ ...current, endsAt: "" }, "2026-10-10T19:00:00Z"), false);
  assert.equal(toEvent({ id: 1, ...eventToRow(current), ends_at: current.endsAt }).endsAt, current.endsAt);
});
test("events with no closing time stay through their final day in San Antonio", () => {
  const allDay = { ...event, endTime: "", endDate: "2026-11-16" };
  assert.equal(isUpcomingEvent(allDay, "2026-11-17T05:59:59Z"), true);
  assert.equal(isUpcomingEvent(allDay, "2026-11-17T06:00:00Z"), false);
});
test("stored end instants handle both daylight saving transitions", () => {
  assert.equal(isUpcomingEvent({ ...event, endsAt: "2026-03-08T08:30:00Z" }, "2026-03-08T08:29:59Z"), true);
  assert.equal(isUpcomingEvent({ ...event, endsAt: "2026-03-08T08:30:00Z" }, "2026-03-08T08:30:00Z"), false);
  assert.equal(isUpcomingEvent({ ...event, endsAt: "2026-11-01T07:30:00Z" }, "2026-11-01T06:30:00Z"), true);
  assert.equal(isUpcomingEvent({ ...event, endsAt: "2026-11-01T07:30:00Z" }, "2026-11-01T07:30:00Z"), false);
});
test("invalid dates, times, missing venues and unsafe links are rejected", () => {
  for (const patch of [{ date: "2026-02-30" }, { endDate: "2026-11-13" }, { endTime: "08:59" }, { startTime: "25:00" }, { venue: "" }, { link: "javascript:alert(1)" }, { link: "https://user:pass@example.com" }, { status: "bogus" }]) assert.throws(() => validateEvent({ ...event, ...patch }));
  assert.throws(() => safeEventImage("https://evil.example/img.png"));
  assert.equal(safeEventImage("/photos/cake.webp"), "/photos/cake.webp");
  assert.throws(() => safeEventImage("/photos/../../file.png"));
});
test("email design accepts selected events and rejects header and HTML color injection", () => {
  assert.deepEqual(validateEventEmail({ ...design, eventIds: ["42", "42"] }).eventIds, ["42"]);
  for (const patch of [{ subject: "Hello\r\nBcc: evil" }, { accent: '#fff;"onclick="x' }, { layout: "bad" }, { eventIds: ["oops"] }, { eventIds: Array(13).fill("42") }]) assert.throws(() => validateEventEmail({ ...design, ...patch }));
});
test("all email layouts escape content and include plain text, location, cancellation and unsubscribe", () => {
  for (const layout of ["spotlight", "digest", "brief"]) {
    const email = buildEventUpdateEmail({ design: { ...design, layout, headline: "<script>alert(1)</script>", message: "Hello & welcome" }, events: [{ ...event, id: "42", status: "cancelled" }], siteUrl: "https://bonbonssweets.com", unsubscribeUrl: "https://bonbonssweets.com/updates/unsubscribe?token=test" });
    assert.doesNotMatch(email.html, /<script>|<morning>|undefined|NaN/); assert.match(email.html, /&lt;script&gt;/);
    assert.match(email.html, /Event cancelled/); assert.match(email.html, /Unsubscribe/); assert.match(email.html, /maps\/search/);
    assert.match(email.text, /CANCELLED/); assert.match(email.text, /San Antonio/); assert.match(email.text, /Unsubscribe:/);
    assert.ok(Buffer.byteLength(email.html) < 50000);
  }
});
test("confirmation email explains opt-in and expiration instead of claiming automatic subscription", () => {
  const email = buildSubscriptionEmail({ confirmationUrl: "https://bonbonssweets.com/updates/confirm?token=test", siteUrl: "https://bonbonssweets.com" });
  assert.match(email.html, /Confirm my email/); assert.match(email.text, /48 hours/); assert.match(email.text, /will not be added/);
});
test("event flyers keep their natural proportions in spotlight and digest emails", () => {
  for (const layout of ["spotlight", "digest"]) {
    const email = buildEventUpdateEmail({ design: { ...design, layout }, events: [{ ...event, id: "42", image: "/photos/flyer.webp" }], siteUrl: "https://bonbonssweets.com", unsubscribeUrl: "https://bonbonssweets.com/updates/unsubscribe?token=test" });
    assert.match(email.html, /src="https:\/\/bonbonssweets.com\/photos\/flyer.webp"/);
    assert.match(email.html, /width:100%;height:auto;border:0/);
    assert.doesNotMatch(email.html, /object-fit:cover|<img[^>]+max-height:/);
  }
});
async function signup({ captcha = true, smtpFails = false, alreadyActive = false } = {}) {
  const calls = [], payloads = [];
  const route = await isolated("app/api/subscribe/route.js", {
    "next/server": { NextResponse }, "node:crypto": { randomBytes }, "@/lib/format": { isEmail },
    "@/lib/supabase-data": { hasSupabaseDatabase: () => true, callBonbonsAdmin: async (action, payload) => { calls.push(action); payloads.push(payload); return { send: !alreadyActive }; } },
    "@/lib/recaptcha": { verifyRecaptcha: async value => { assert.equal(value.expectedAction, RECAPTCHA_ACTIONS.subscribe); calls.push("captcha"); return { ok: captcha }; } },
    "@/lib/recaptcha-actions": { RECAPTCHA_ACTIONS },
    "@/lib/email": { hasEmailConfiguration: () => true, sendEventEmail: async value => { calls.push("send-confirmation"); assert.equal(value.recipient, "customer@example.invalid"); if (smtpFails) throw new Error("SMTP secret"); } },
    "@/lib/event-email": { buildSubscriptionEmail }, "@/lib/event-mailing": { eventSiteUrl: () => "https://bonbonssweets.com" },
  });
  return { route, calls, payloads };
}
test("signup requires explicit consent before CAPTCHA, database writes or mail", async () => {
  const { route, calls } = await signup(); const response = await route.POST(request({ email: "customer@example.invalid" }));
  assert.equal(response.status, 400); assert.deepEqual(calls, []);
});
test("CAPTCHA failure blocks signup and sending", async () => {
  const { route, calls } = await signup({ captcha: false }); const response = await route.POST(request({ email: "customer@example.invalid", consent: true }));
  assert.equal(response.status, 403); assert.deepEqual(calls, ["captcha"]);
});
test("signup normalizes the address and only sends confirmation; private tokens stay out of responses", async () => {
  const { route, calls, payloads } = await signup(); const response = await route.POST(request({ email: " CUSTOMER@example.invalid ", consent: true, recaptchaToken: "test", source: "events" }));
  assert.equal(response.status, 200); assert.deepEqual(calls, ["captcha", "subscriber_request", "send-confirmation"]);
  assert.equal(payloads[0].email, "customer@example.invalid"); assert.match(payloads[0].token, /^[a-f0-9]{48}$/);
  assert.doesNotMatch(await response.text(), /token|customer@example/);
});
test("confirmation failures leave a pending address and allow another attempt without leaking SMTP errors", async () => {
  const { route, calls } = await signup({ smtpFails: true }); const response = await route.POST(request({ email: "customer@example.invalid", consent: true }));
  assert.equal(response.status, 503); assert.equal(calls.at(-1), "subscriber_confirmation_failed"); assert.doesNotMatch(await response.text(), /secret/);
});
test("active addresses and confirmation cooldown use the same success response and no extra message", async () => {
  const { route, calls } = await signup({ alreadyActive: true }); const response = await route.POST(request({ email: "customer@example.invalid", consent: true }));
  assert.equal(response.status, 200); assert.deepEqual(calls, ["captcha", "subscriber_request"]);
});
test("opening a confirmation page cannot confirm an email; token validation happens before RPC", async () => {
  let confirmed = false;
  const route = await isolated("app/api/updates/confirm/route.js", { "next/server": { NextResponse }, "@/lib/supabase-data": { callBonbonsAdmin: async () => { confirmed = true; } } });
  assert.equal(route.GET, undefined); assert.equal((await route.POST(request({ token: "bad" }))).status, 400); assert.equal(confirmed, false);
  assert.equal((await route.POST(request({ token: "a".repeat(48) }))).status, 200); assert.equal(confirmed, true);
});
test("provider one-click unsubscribe supports POST query tokens, with no state-changing GET", async () => {
  let action;
  const route = await isolated("app/api/updates/unsubscribe/route.js", { "next/server": { NextResponse }, "@/lib/supabase-data": { callBonbonsAdmin: async a => { action = a; } } });
  const response = await route.POST(new Request(`https://bonbonssweets.com/api/updates/unsubscribe?token=${"b".repeat(48)}`, { method: "POST", body: "List-Unsubscribe=One-Click" }));
  assert.equal(response.status, 200); assert.equal(action, "subscriber_unsubscribe"); assert.equal(route.GET, undefined);
});
async function batch({ active = true, smtpFails = false, recordingFails = false } = {}) {
  const calls = [];
  const module = await isolated("lib/event-mailing.js", {
    "./supabase-data.js": { callBonbonsAdmin: async (action, payload) => {
      calls.push({ action, payload });
      if (action === "event_campaign_claim") return [{ id: "test-delivery", attempt: "attempt", email: "customer@example.invalid", unsubscribeToken: "a".repeat(48), snapshot: { design, events: [{ id: 42, ...eventToRow(event) }] } }];
      if (action === "event_delivery_check") return { active };
      if (action === "event_delivery_finish" && recordingFails) throw new Error("DB unavailable after SMTP");
      return { sent: 1, queued: 0 };
    } },
    "./email.js": { sendEventEmail: async () => { calls.push({ action: "SMTP" }); if (smtpFails) throw new Error("secret SMTP error"); return { messageId: "mail-test" }; } },
    "./event-email.js": { buildEventUpdateEmail }, "./events.js": { toEvent },
  }, { NEXT_PUBLIC_SITE_URL: "https://bonbonssweets.com" });
  return { module, calls };
}
test("delivery rechecks opt-in immediately before sending, skipping unsubscribed addresses", async () => {
  const { module, calls } = await batch({ active: false }); await module.processEventEmailBatch("1");
  assert.equal(calls.some(c => c.action === "SMTP"), false); assert.equal(calls.find(c => c.action === "event_delivery_finish").payload.status, "skipped");
});
test("SMTP failure is recorded for manual retry with no secret leakage", async () => {
  const { module, calls } = await batch({ smtpFails: true }); await module.processEventEmailBatch("1");
  assert.equal(calls.filter(c => c.action === "SMTP").length, 1);
  const finish = calls.find(c => c.action === "event_delivery_finish"); assert.equal(finish.payload.status, "failed"); assert.doesNotMatch(finish.payload.error, /secret/);
});
test("a DB failure after accepted mail stops the worker; it never automatically resends", async () => {
  const { module, calls } = await batch({ recordingFails: true }); await assert.rejects(module.processEventEmailBatch("1"));
  assert.equal(calls.filter(c => c.action === "SMTP").length, 1); assert.equal(calls.filter(c => c.action === "event_delivery_finish").length, 1);
});
test("admin event mutations are guarded before processing any payload", async () => {
  let accessed = false;
  const route = await isolated("app/api/admin/events/route.js", { "next/server": { NextResponse }, "@/lib/admin-menu": { menuGuard: async () => Response.json({ error: "Unauthorized" }, { status: 401 }), menuError: () => {} }, "@/lib/supabase-data": { callBonbonsAdmin: async () => { accessed = true; } }, "@/lib/events": { validateEvent, eventToRow, toEvent } });
  assert.equal((await route.POST(request(event))).status, 401); assert.equal(accessed, false);
});

test("send endpoint never reaches the mail worker without admin mutation authorization", async () => {
  let worked = false;
  const route = await isolated("app/api/admin/events/emails/[id]/send/route.js", {
    "next/server": { NextResponse }, "@/lib/admin-menu": { menuGuard: async () => Response.json({ error: "Denied" }, { status: 403 }), menuError: () => {} },
    "@/lib/supabase-data": { callBonbonsAdmin: async () => { worked = true; } },
    "@/lib/email": { hasEmailConfiguration: () => true }, "@/lib/event-mailing": { processEventEmailBatch: async () => { worked = true; } },
  });
  assert.equal((await route.POST(request({ action: "begin" }), { params: Promise.resolve({ id: "1" }) })).status, 403); assert.equal(worked, false);
});

test("email preview reports events that were archived after a draft was saved", async () => {
  const route = await isolated("app/api/admin/events/emails/preview/route.js", {
    "next/server": { NextResponse }, "@/lib/admin-menu": { menuGuard: async () => null, menuError: error => Response.json({ error: error.message }, { status: 400 }) },
    "@/lib/supabase-data": { callBonbonsAdmin: async () => [{ id: 42, ...eventToRow(event), status: "archived" }] },
    "@/lib/events": { validateEventEmail, toEvent }, "@/lib/event-email": { buildEventUpdateEmail },
  });
  const response = await route.POST(request({ design })); assert.equal(response.status, 400); assert.match(await response.text(), /no longer published/);
});
