import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { STYLED_PRODUCT_PHOTOS, FOUR_PACK_PHOTO, REAL_ASSORTMENT_PHOTO, currentProductPhoto, isStyledProductPhoto, savedCartPhoto } from "../lib/product-photos.js";
import { SAMPLE_PRODUCTS } from "../lib/sample-data.js";
import { isMenuImageUrl } from "../supabase/functions/_shared/menu.js";

const root = resolve(import.meta.dirname, "..");
const retired = ["/products/cake-pops.png", "/products/chocolate-drizzle-cake-pops.png", "/products/sprinkle-party-cake-pops.png", "/products/hero-cake-pops.png"];

test("all styled photos are real, full-size PNG assets accepted by the menu", () => {
  for (const path of [...Object.values(STYLED_PRODUCT_PHOTOS), FOUR_PACK_PHOTO]) {
    assert.ok(isMenuImageUrl(path));
    const png = readFileSync(resolve(root, "public" + path));
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.ok(png.readUInt32BE(16) >= 1000);
    assert.ok(png.readUInt32BE(20) >= 1000);
  }
});

test("all six original customer photos are preserved in the project", () => {
  for (const name of ["real-assortment", "real-pickup", "real-gift-box", "real-colorful-pops", "real-party-box", "cookie-strawberry-reference"]) {
    const photo = readFileSync(resolve(root, `public/products/bonbons-${name}.jpg`));
    assert.equal(photo.readUInt16BE(0), 0xffd8);
    assert.ok(photo.length > 10000);
  }
});

test("each starter flavor has its own matching photo with pricing unchanged", () => {
  assert.equal(SAMPLE_PRODUCTS.length, 3);
  for (const product of SAMPLE_PRODUCTS) {
    assert.equal(product.image, STYLED_PRODUCT_PHOTOS[product.slug]);
    assert.equal(product.price, 4);
    assert.equal(product.bundleEligible, true);
  }
});

test("only the commissioned styled photos get the disclosure", () => {
  for (const path of [...Object.values(STYLED_PRODUCT_PHOTOS), FOUR_PACK_PHOTO]) assert.equal(isStyledProductPhoto(path), true);
  for (const path of [REAL_ASSORTMENT_PHOTO, "/products/owner-photo.png", "", undefined, "https://example.com/image.png"]) assert.equal(isStyledProductPhoto(path), false);
});

test("saved carts remap retired generic photos without mutating order details", () => {
  for (const image of retired) {
    const item = { key: "cookie-monster", image, qty: 10, price: 4 };
    const before = structuredClone(item);
    assert.equal(savedCartPhoto(item), REAL_ASSORTMENT_PHOTO);
    assert.deepEqual(item, before);
  }
});

test("saved photo-less flavors and four-packs receive a matching thumbnail", () => {
  assert.equal(savedCartPhoto({ key: "box-4-mixed" }), FOUR_PACK_PHOTO);
  for (const [slug, image] of Object.entries(STYLED_PRODUCT_PHOTOS)) assert.equal(savedCartPhoto({ key: slug, image: "" }), image);
  assert.equal(savedCartPhoto({ key: "unknown", image: "" }), "/logo-transparent.png");
});

test("new owner photos and intentional empty CMS images are not overwritten", () => {
  const image = "https://slerrjoiowaskmvgykxt.supabase.co/storage/v1/object/public/menu-photos/owner.jpg";
  assert.equal(currentProductPhoto(image), image);
  assert.equal(savedCartPhoto({ key: "cookie-monster", image }), image);
  assert.equal(currentProductPhoto(""), "");
  assert.equal(currentProductPhoto(undefined), undefined);
  assert.ok(readFileSync(resolve(root, "lib/products.js"), "utf8").includes("(data || []).map(toProduct)"));
});

test("storefront components no longer reference retired generic photos", () => {
  function inspect(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) inspect(path);
      else if (/\.(jsx?|css)$/.test(entry.name)) {
        const source = readFileSync(path, "utf8");
        for (const image of retired) assert.ok(!source.includes(image), `${path} still references ${image}`);
      }
    }
  }
  inspect(resolve(root, "app"));
  inspect(resolve(root, "components"));
  assert.ok(existsSync(resolve(root, "components/BakeryPhotoGallery.jsx")));
});
