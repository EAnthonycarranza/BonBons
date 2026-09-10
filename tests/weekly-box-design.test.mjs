import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { weeklyBoxPresentation } from "../lib/weekly-box-presentation.js";
import { FOUR_PACK_PHOTO, STYLED_PRODUCT_PHOTOS } from "../lib/product-photos.js";

const box = { title: "Celebration Box", price: 25, image: FOUR_PACK_PHOTO, items: [
  { slug: "cookie-monster", name: "Cookie Monster", qty: 4, note: "Top seller" },
  { slug: "strawberry-shortcake", name: "Strawberry Shortcake", qty: 3, note: "" },
  { slug: "biscoff", name: "Biscoff", qty: 3, note: "" },
] };
test("ten cake pops are not advertised as ten flavors", () => {
  const data = weeklyBoxPresentation(box);
  assert.equal(data.popCount, 10);
  assert.equal(data.flavorCount, 3);
  assert.deepEqual(data.items.map(item => item.qty), [4, 3, 3]);
});
test("the seeded four-pack photo is replaced by a flavor preview, not presented as a ten-pop box", () => {
  const data = weeklyBoxPresentation(box);
  assert.equal(data.boxImage, "");
  assert.equal(data.hasStyledPhotos, true);
  assert.equal(data.cartImage, STYLED_PRODUCT_PHOTOS["cookie-monster"]);
});
test("admin-uploaded box and flavor photos take precedence", () => {
  const image = "https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/menu-photos/box.jpg";
  const data = weeklyBoxPresentation({ ...box, image }, [{ slug: "cookie-monster", image: "/products/bonbons-real-pickup.jpg" }]);
  assert.equal(data.boxImage, image);
  assert.equal(data.cartImage, image);
  assert.equal(data.items[0].image, "/products/bonbons-real-pickup.jpg");
});
test("new box contents and prices are preserved without mutation", () => {
  const changed = { ...box, price: 31.5, items: [{ name: "New flavor", slug: "new-flavor", qty: 6, note: "Made this week" }] };
  const before = structuredClone(changed);
  const data = weeklyBoxPresentation(changed);
  assert.equal(data.popCount, 6);
  assert.equal(data.flavorCount, 1);
  assert.equal(data.items[0].image, "");
  assert.equal(data.items[0].note, "Made this week");
  assert.deepEqual(changed, before);
});
test("unknown or unsafe photo URLs never become image requests", () => {
  const data = weeklyBoxPresentation({ ...box, image: "https://untrusted.example/photo.jpg" }, [{ slug: "cookie-monster", image: "javascript:alert(1)" }]);
  assert.equal(data.boxImage, "");
  assert.equal(data.items[0].image, "");
});
test("no weekly box yields an empty, safe presentation", () => {
  const data = weeklyBoxPresentation(null);
  assert.equal(data.popCount, 0);
  assert.equal(data.flavorCount, 0);
  assert.deepEqual(data.items, []);
  assert.equal(data.hasStyledPhotos, false);
});
test("the homepage advertises the live box before the everyday menu", () => {
  const source = readFileSync(new URL("../app/page.js", import.meta.url), "utf8");
  assert.ok(source.indexOf("<WeeklyBoxTeaser") < source.indexOf('className="sec menu-section"'));
  assert.ok(source.includes("products={products}"));
});
test("new page has one main landmark and no fixed price or invented flavor claims", () => {
  const page = readFileSync(new URL("../app/box-of-the-week/page.js", import.meta.url), "utf8");
  assert.ok(!page.includes("<main"));
  assert.ok(page.includes("money(box.price)"));
  assert.ok(!page.includes("10 flavors"));
  assert.ok(page.includes("soldOut ?"));
  assert.ok(page.includes("if (!box)"));
  assert.ok(!page.includes("finishes may vary"));
});
test("weekly flyers are shown intact and can be opened full-size", () => {
  const artwork = readFileSync(new URL("../components/WeeklyBoxArtwork.jsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../app/celebration-box.css", import.meta.url), "utf8");
  assert.ok(!artwork.includes("Styled photos"));
  assert.ok(artwork.includes('href={presentation.boxImage}'));
  assert.ok(artwork.includes('rel="noopener noreferrer"'));
  assert.match(css, /\.weekly-poster-sheet\s*>\s*img\s*\{\s*object-fit:\s*contain/);
  assert.match(css, /\.weekly-poster-sheet\s*\{[^}]*aspect-ratio:\s*4\s*\/\s*5/);
});
test("weekly-box upload reuses the authenticated endpoint and protects unsaved work", () => {
  const editor = readFileSync(new URL("../components/WeeklyBoxManager.jsx", import.meta.url), "utf8");
  assert.ok(editor.includes('fetch("/api/admin/menu/photo"'));
  assert.ok(editor.includes('file.size > MENU_IMAGE_MAX_BYTES'));
  assert.ok(editor.includes('!isMenuImageUrl(data.url)'));
  assert.ok(editor.includes('disabled={busy || uploading}'));
  assert.ok(editor.includes('if (busy || uploading) return;'));
  assert.ok(editor.includes('Save this box to publish it.'));
  assert.ok(editor.includes('change("image", "")'));
});
