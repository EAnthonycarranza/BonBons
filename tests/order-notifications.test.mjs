import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { createHash, timingSafeEqual } from "node:crypto";
async function processor({
  mailFails = false,
  finishFails = false,
  uncertain = false,
} = {}) {
  const calls = [],
    source = await readFile(
      new URL("../lib/order-notifications.js", import.meta.url),
      "utf8",
    );
  const context = vm.createContext({}),
    module = new vm.SourceTextModule(source, { context });
  const imports = {
    "server-only": {},
    "./supabase-data": {
      toOrder: (r) => r,
      callBonbonsAdmin: async (action, payload) => {
        calls.push({ action, payload });
        if (action === "order_notification_claim")
          return [{ order: { id: "900001" }, lease: "test-lease" }];
        if (finishFails) throw Error("Tracking unavailable");
      },
    },
    "./email": {
      sendIncomingOrderNotification: async () => {
        calls.push({ action: "send" });
        if (mailFails) {
          const e = Error("SMTP failed");
          if (uncertain) e.command = "DATA";
          throw e;
        }
        return { messageId: "test-message" };
      },
    },
  };
  await module.link((specifier) => {
    const values = imports[specifier];
    assert.ok(values);
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        Object.entries(values).forEach(([k, v]) => this.setExport(k, v));
      },
      { context },
    );
  });
  await module.evaluate();
  return { run: module.namespace.processOrderNotifications, calls };
}
test("queue claims before sending and records provider acceptance", async () => {
  const p = await processor();
  const result = await p.run({ orderId: "900001" });
  assert.equal(result.sent, 1);
  assert.deepEqual(
    p.calls.map((c) => c.action),
    ["order_notification_claim", "send", "order_notification_finish"],
  );
  assert.equal(p.calls[2].payload.status, "sent");
  assert.equal(p.calls[2].payload.lease, "test-lease");
});
test("a rejected send is retryable and does not resend in the same batch", async () => {
  const p = await processor({ mailFails: true });
  await p.run();
  assert.equal(p.calls[2].payload.status, "retry");
  assert.equal(p.calls.filter((c) => c.action === "send").length, 1);
});
test("an uncertain SMTP outcome needs review instead of an automatic duplicate", async () => {
  const p = await processor({ mailFails: true, uncertain: true });
  await p.run();
  assert.equal(p.calls[2].payload.status, "needs_review");
});
test("tracking failure after acceptance never calls SMTP again", async () => {
  const p = await processor({ finishFails: true });
  await assert.rejects(() => p.run());
  assert.equal(p.calls.filter((c) => c.action === "send").length, 1);
});

async function routeHarness(file, imports, env = {}) {
  const context = vm.createContext({ Response, process: { env } });
  const module = new vm.SourceTextModule(
    await readFile(new URL(`../${file}`, import.meta.url), "utf8"),
    { context },
  );
  await module.link((specifier) => {
    const values = imports[specifier];
    assert.ok(values, specifier);
    return new vm.SyntheticModule(
      Object.keys(values),
      function () {
        Object.entries(values).forEach(([key, value]) =>
          this.setExport(key, value),
        );
      },
      { context },
    );
  });
  await module.evaluate();
  return module.namespace;
}

test("the worker rejects missing and incorrect tokens before touching the email queue", async () => {
  let calls = 0;
  const route = await routeHarness(
    "app/api/internal/order-notifications/route.js",
    {
      "next/server": { NextResponse: Response },
      "node:crypto": { createHash, timingSafeEqual },
      "@/lib/order-notifications": {
        processOrderNotifications: async () => {
          calls++;
          return { processed: 0, sent: 0 };
        },
      },
    },
    { BONBONS_INTERNAL_API_TOKEN: "unit-test-token" },
  );
  const request = (token) =>
    new Request("http://localhost/api/internal/order-notifications", {
      method: "POST",
      headers: token ? { "x-internal-token": token } : {},
    });
  for (const token of [undefined, "incorrect"])
    assert.equal((await route.POST(request(token))).status, 401);
  assert.equal(calls, 0);
  assert.equal((await route.POST(request("unit-test-token"))).status, 200);
  assert.equal(calls, 1);
});

test("a denied admin retry cannot reset or send a notification", async () => {
  let called = false;
  const route = await routeHarness(
    "app/api/admin/orders/[id]/notification/route.js",
    {
      "next/server": { NextResponse: Response },
      "@/lib/admin-menu": {
        menuGuard: async () =>
          Response.json({ error: "Denied" }, { status: 403 }),
        menuError: () => {},
      },
      "@/lib/supabase-data": {
        callBonbonsAdmin: async () => {
          called = true;
        },
        toOrder: (value) => value,
      },
      "@/lib/order-notifications": {
        processOrderNotifications: async () => {
          called = true;
        },
      },
    },
  );
  assert.equal(
    (
      await route.POST(
        new Request("http://localhost/api/admin/orders/42/notification", {
          method: "POST",
        }),
        { params: Promise.resolve({ id: "42" }) },
      )
    ).status,
    403,
  );
  assert.equal(called, false);
});
