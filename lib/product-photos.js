// Reference-based styled photos commissioned from Bonnie's September 2026
// photos. Keep this explicit list so future owner uploads aren't mislabeled.
export const STYLED_PRODUCT_PHOTOS = {
  "cookie-monster": "/products/bonbons-cookie-monster-styled.png",
  "strawberry-shortcake": "/products/bonbons-strawberry-shortcake-styled.png",
  biscoff: "/products/bonbons-biscoff-styled.png",
};

export const FOUR_PACK_PHOTO = "/products/bonbons-four-pack-styled.png";
export const REAL_ASSORTMENT_PHOTO = "/products/bonbons-real-assortment.jpg";

// Old saved carts may still carry the original generic image URLs. Remap only
// those known placeholders; never replace a newly uploaded owner photo.
const RETIRED_PHOTOS = new Set([
  "/products/cake-pops.png",
  "/products/chocolate-drizzle-cake-pops.png",
  "/products/sprinkle-party-cake-pops.png",
  "/products/hero-cake-pops.png",
]);

export function currentProductPhoto(image) {
  return RETIRED_PHOTOS.has(image) ? REAL_ASSORTMENT_PHOTO : image;
}

export function isStyledProductPhoto(image) {
  return image === FOUR_PACK_PHOTO || Object.values(STYLED_PRODUCT_PHOTOS).includes(image);
}

export function savedCartPhoto(item) {
  const image = currentProductPhoto(item.image);
  if (image && image !== "/logo-transparent.png") return image;
  if (item.key?.startsWith("box-")) return FOUR_PACK_PHOTO;
  return STYLED_PRODUCT_PHOTOS[item.key] || image || "/logo-transparent.png";
}
