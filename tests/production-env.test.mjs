import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/check-production-env.mjs", import.meta.url));
// Fictional fixtures only: do not load developer or production credentials.
const valid = {
  NEXT_PUBLIC_SITE_URL: "https://test-store.herokuapp.com",
  NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
  BONBONS_INTERNAL_API_TOKEN: "test-internal-token",
  ADMIN_PASSWORD: "Sample42",
  ADMIN_SECRET: "test-signing-secret-with-at-least-32-characters",
  GMAIL_USER: "fixture@example.com",
  GMAIL_APP_PASSWORD: "test-mail-password",
  NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY: "test-site-key",
  GOOGLE_CLOUD_PROJECT_ID: "test-project",
  GOOGLE_RECAPTCHA_API_KEY: "test-api-key",
};

function run(overrides = {}) {
  return spawnSync(process.execPath, [script], {
    env: { ...valid, ...overrides }, encoding: "utf8",
  });
}

test("accepts an eight-character owner-selected password", () => {
  assert.equal(run().status, 0);
});

test("continues to accept long passwords", () => {
  assert.equal(run({ ADMIN_PASSWORD: "a-long-unique-test-password" }).status, 0);
});

test("rejects missing, short, and placeholder login passwords", () => {
  for (const password of ["", "Short42", "changeme", "replace-with-password"]) {
    const result = run({ ADMIN_PASSWORD: password });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ADMIN_PASSWORD/);
  }
});

test("keeps the signing-secret minimum and placeholder rejection", () => {
  for (const secret of ["", "s".repeat(31), "please-change-this-to-a-long-secret"]) {
    const result = run({ ADMIN_SECRET: secret });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ADMIN_SECRET/);
  }
  assert.equal(run({ ADMIN_SECRET: "s".repeat(32) }).status, 0);
});

test("still requires other production settings and HTTPS origin", () => {
  assert.equal(run({ GOOGLE_RECAPTCHA_API_KEY: "" }).status, 1);
  assert.equal(run({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" }).status, 1);
});

test("never prints credential values on validation failure", () => {
  const password = "short42";
  const result = run({ ADMIN_PASSWORD: password, ADMIN_SECRET: "tiny-secret" });
  const logs = result.stdout + result.stderr;
  assert.equal(result.status, 1);
  assert.ok(!logs.includes(password));
  assert.ok(!logs.includes("tiny-secret"));
  assert.ok(!logs.includes(valid.GMAIL_APP_PASSWORD));
});
