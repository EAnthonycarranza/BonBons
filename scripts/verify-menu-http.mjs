// Explicit integration check. Creates one HIDDEN QA flavor, never an order or email.
// Run only when requested: node --env-file=.env.local scripts/verify-menu-http.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.MENU_QA_ORIGIN || "http://127.0.0.1:3088";
const slug = `qa-menu-${Date.now()}`;
let cookie = "";
let product;
let uploadedPhoto;
async function call(path, { method = "GET", body, origin = base } = {}) {
  const response = await fetch(`${base}${path}`, {
    method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json", Origin: origin } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json(), response };
}
function payload(overrides = {}) {
  return { name: "QA — Menu integration test", slug, price: 4, active: false, bundle_eligible: true, blurb: "Temporary hidden verification item", sort_order: 9999, expectedUpdatedAt: product?.updatedAt, ...overrides };
}
try {
  assert.equal((await call("/api/admin/menu")).status, 401);
  assert.equal((await call("/api/admin/menu", { method: "POST", body: payload() })).status, 401);
  const login = await call("/api/admin/login", { method: "POST", body: { password: process.env.ADMIN_PASSWORD } });
  assert.equal(login.status, 200);
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  assert.equal((await call("/api/admin/menu", { method: "POST", body: payload(), origin: "https://unrelated.invalid" })).status, 403);
  assert.equal((await call("/api/admin/menu", { method: "POST", body: payload({ price: 1 }) })).status, 400);
  const added = await call("/api/admin/menu", { method: "POST", body: payload() });
  assert.equal(added.status, 201, JSON.stringify(added.data)); product = added.data.product;
  assert.equal(product.active, false);
  assert.equal((await call("/api/admin/menu", { method: "POST", body: payload() })).status, 409);
  const originalTimestamp = product.updatedAt;
  const edited = await call(`/api/admin/menu/${product.id}`, { method: "PATCH", body: payload({ blurb: "Updated hidden flavor" }) });
  assert.equal(edited.status, 200, JSON.stringify(edited.data)); product = edited.data.product;
  assert.equal(product.blurb, "Updated hidden flavor");
  assert.equal((await call(`/api/admin/menu/${product.id}`, { method: "PATCH", body: payload({ expectedUpdatedAt: originalTimestamp }) })).status, 409);
  const invalidPhoto = new FormData(); invalidPhoto.set("photo", new File(["Not a photo"], "fake.png", { type: "image/png" }));
  const invalidUpload = await fetch(`${base}/api/admin/menu/photo`, { method: "POST", headers: { cookie, Origin: base }, body: invalidPhoto });
  assert.equal(invalidUpload.status, 400);
  const form = new FormData(); form.set("photo", new File([await readFile("public/logo-transparent.png")], "qa-logo.png", { type: "image/png" }));
  const upload = await fetch(`${base}/api/admin/menu/photo`, { method: "POST", headers: { cookie, Origin: base }, body: form });
  const photo = await upload.json(); assert.equal(upload.status, 201, JSON.stringify(photo)); uploadedPhoto = photo.url;
  assert.equal((await fetch(uploadedPhoto)).status, 200);
  const withPhoto = await call(`/api/admin/menu/${product.id}`, { method: "PATCH", body: payload({ image: uploadedPhoto }) });
  assert.equal(withPhoto.status, 200); product = withPhoto.data.product;
  const publicMenu = await call("/api/products");
  assert.ok(!JSON.stringify(publicMenu.data).includes(slug));
  const deleted = await call(`/api/admin/menu/${product.id}`, { method: "DELETE", body: { expectedUpdatedAt: product.updatedAt } });
  assert.equal(deleted.status, 200); product = deleted.data.product;
  assert.ok(product.deletedAt);
  assert.equal(product.active, false);
  const restored = await call(`/api/admin/menu/${product.id}`, { method: "PATCH", body: { restore: true, expectedUpdatedAt: product.updatedAt } });
  assert.equal(restored.status, 200); product = restored.data.product;
  assert.equal(product.deletedAt, null);
  assert.equal(product.active, false);
  const html = await fetch(`${base}/admin`, { headers: { cookie } }).then(r => r.text());
  assert.ok(html.includes("Your cake-pop menu."));
  assert.ok(html.includes("Add menu item"));
  console.log(JSON.stringify({ passed: true, checks: ["authentication", "cross-site protection", "validation", "create", "duplicate", "edit", "conflict", "photo upload", "public visibility", "delete", "restore", "admin markup"], fixture: { id: product.id, slug }, uploadedPhoto }));
} catch (error) {
  console.error(JSON.stringify({ passed: false, error: error.message, fixture: product ? { id: product.id, slug } : null, uploadedPhoto }));
  process.exitCode = 1;
}
