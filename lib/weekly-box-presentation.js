import { boxPopCount, isMenuImageUrl } from "../supabase/functions/_shared/menu.js";
import { FOUR_PACK_PHOTO, STYLED_PRODUCT_PHOTOS, isStyledProductPhoto } from "./product-photos.js";

/** Presentation only. Never changes the admin's recipe, stock, or pricing. */
export function weeklyBoxPresentation(box, products = []) {
  const menu = new Map(products.map(product => [product.slug, product]));
  const items = (box?.items || []).map(item => {
    // These commissioned editorial previews belong to the weekly feature.
    // Owner-uploaded menu photos take precedence; no database image is changed.
    const image = menu.get(item.slug)?.image || STYLED_PRODUCT_PHOTOS[item.slug] || "";
    return { ...item, image: isMenuImageUrl(image) ? image : "" };
  });
  // The original seed reused a four-pack photo for a ten-pop box. Show the
  // included flavors instead; any actual box photo uploaded by the owner wins.
  const boxImage = box?.image && box.image !== FOUR_PACK_PHOTO && isMenuImageUrl(box.image) ? box.image : "";
  return {
    items,
    popCount: boxPopCount(items),
    flavorCount: new Set(items.map(item => item.slug || item.name.trim().toLowerCase())).size,
    boxImage,
    hasStyledPhotos: items.some(item => isStyledProductPhoto(item.image)) || isStyledProductPhoto(boxImage),
    cartImage: boxImage || items.find(item => item.image)?.image || "/logo-transparent.png",
  };
}
