import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import {
  CART_PARTY_SIZES, CART_EVENT_TYPES, EVENT_TYPE_OTHER,
  partySizeById, partySizeLabel, resolveEventType,
} from "../lib/cart-rental.js";
import * as cartRental from "../lib/cart-rental.js";
import { isEmail, isPhone } from "../lib/format.js";

// Same isolation as the email suite: the route sees only what we hand it.
async function isolated(file, imports) {
  const context = vm.createContext({ process: { env: {} }, console: { error() {} }, Response, Request });
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

test("three party sizes, ascending, and the largest is the cart's limit", () => {
  assert.equal(CART_PARTY_SIZES.length, 3);
  const maxes = CART_PARTY_SIZES.map((s) => s.max);
  assert.deepEqual(maxes, [...maxes].sort((a, b) => a - b));
  assert.ok(CART_PARTY_SIZES.at(-1).note, "the largest tier explains it is the most the cart can serve");
});

test("party size label maps a tier boundary back to its tier, and leaves other numbers honest", () => {
  const medium = CART_PARTY_SIZES[1];
  assert.equal(partySizeLabel(medium.max), `${medium.label} · ${medium.range}`);
  assert.equal(partySizeLabel(24), "24 guests");      // an older request that stored a count
  assert.equal(partySizeLabel(0), "");
  assert.equal(partySizeLabel("nope"), "");
  assert.equal(partySizeById("medium"), medium);
  assert.equal(partySizeById("huge"), null);
});

test("event type: known values pass, Other needs text, anything else is rejected", () => {
  assert.equal(resolveEventType("Wedding"), "Wedding");
  assert.equal(resolveEventType(EVENT_TYPE_OTHER, "  Retirement party "), "Retirement party");
  assert.equal(resolveEventType(EVENT_TYPE_OTHER, ""), "");
  assert.equal(resolveEventType("Heist", "no"), "");
  assert.ok(CART_EVENT_TYPES.includes(EVENT_TYPE_OTHER), "Other must be offered");
  assert.equal(resolveEventType(EVENT_TYPE_OTHER, "x".repeat(500)).length, 120, "free text is capped");
});

async function routeWith(capture) {
  return isolated("app/api/quotes/route.js", {
    "next/server": { NextResponse: Response },
    "@/lib/auth": { isAdmin: async () => false },
    "@/lib/format": { isEmail, isPhone },
    "@/lib/cart-rental": cartRental,
    "@/lib/supabase-data": {
      hasSupabaseDatabase: () => true,
      callSupabaseData: async (action, payload) => { capture.push([action, payload]); return { data: { id: 1 } }; },
      quoteToRow: (q) => ({ occasion: q.occasion, guests: q.guests, notes: q.notes }),
      toQuote: (r) => r,
    },
  });
}

const valid = {
  name: "Jamie", email: "jamie@example.invalid", phone: "2105550100",
  eventDate: "2026-10-04", eventType: "Birthday", partySize: "medium", notes: "",
};

async function post(route, body) {
  const res = await route.POST(new Request("http://x/api/quotes", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  }));
  return { status: res.status, json: await res.json() };
}

test("a valid cart request stores the event type and the tier's upper bound", async () => {
  const calls = [];
  const route = await routeWith(calls);
  const { status, json } = await post(route, valid);
  assert.equal(status, 200);
  assert.match(json.message, /go over the event details/);
  assert.match(json.message, /confirm flavors and price/);
  assert.match(json.message, /coordinate the cart/);
  const [[action, payload]] = calls;
  assert.equal(action, "create_quote");
  assert.equal(payload.quote.occasion, "Birthday");
  assert.equal(payload.quote.guests, CART_PARTY_SIZES[1].max);
});

test("Other stores the customer's own words as the event type", async () => {
  const calls = [];
  const route = await routeWith(calls);
  const { status } = await post(route, { ...valid, eventType: EVENT_TYPE_OTHER, eventTypeOther: "Retirement party" });
  assert.equal(status, 200);
  assert.equal(calls[0][1].quote.occasion, "Retirement party");
});

test("missing or bad event details are rejected before anything is saved", async () => {
  const calls = [];
  const route = await routeWith(calls);
  for (const [body, field] of [
    [{ ...valid, eventType: "" }, "eventType"],
    [{ ...valid, eventType: EVENT_TYPE_OTHER, eventTypeOther: "  " }, "eventTypeOther"],
    [{ ...valid, partySize: "stadium" }, "partySize"],
    [{ ...valid, eventDate: "" }, "eventDate"],
  ]) {
    const { status, json } = await post(route, body);
    assert.equal(status, 400, field);
    assert.match(json.error, new RegExp(field), field);
  }
  assert.equal(calls.length, 0, "nothing reached the database");
});
