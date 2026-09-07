// Shared by the website and the authenticated Edge Function. No browser-only
// validation: the same rules apply at the database boundary.
export class MenuValidationError extends Error {}

export const MENU_PRICE = 4;
export const MENU_IMAGE_BUCKET = "menu-photos";
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MENU_ALLERGENS = ["milk", "eggs", "wheat", "soy", "peanuts", "tree nuts", "sesame", "dairy"];

export function menuSlug(name) {
  return String(name || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
}

export function isMenuImageUrl(value) {
  if (!value) return true;
  if (/^\/(products\/[a-z0-9-]+\.(png|jpg|jpeg|webp)|logo-transparent\.png)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "slerrjoiowaskmvgykxt.supabase.co" &&
      url.pathname.startsWith(`/storage/v1/object/public/${MENU_IMAGE_BUCKET}/`) &&
      !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

export function validateMenuProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MenuValidationError("Enter the cake-pop details.");
  function text(key, limit, required = false) {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.trim().length > limit || (required && !value.trim())) {
      throw new MenuValidationError(`${key === "name" ? "Flavor name" : key} must be ${required ? "1–" : "no more than "}${limit} characters.`);
    }
    return value.trim();
  }
  const name = text("name", 80, true);
  const slug = text("slug", 100, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new MenuValidationError("Use only lowercase letters, numbers, and single hyphens in the menu link.");
  if (typeof input.price !== "number" || input.price !== MENU_PRICE) throw new MenuValidationError("Single cake pops are $4 each. Four-packs are selected separately for $10.");
  if (typeof input.active !== "boolean" || typeof input.bundle_eligible !== "boolean") throw new MenuValidationError("Choose the menu visibility and four-pack availability.");
  const image = text("image", 1000);
  if (!isMenuImageUrl(image)) throw new MenuValidationError("Upload a JPG, PNG, or WebP photo using the photo picker.");
  const sortOrder = input.sort_order ?? 0;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) throw new MenuValidationError("Display order must be a whole number from 0 to 10000.");
  const allergens = input.allergens ?? [];
  if (!Array.isArray(allergens) || allergens.some(value => !MENU_ALLERGENS.includes(value))) throw new MenuValidationError("Choose allergens from the provided list.");
  const source = text("source_url", 500);
  if (source) {
    let valid = false;
    try { const url = new URL(source); valid = url.protocol === "https:" && url.hostname === "www.instagram.com" && !url.username && !url.password; } catch {}
    if (!valid) throw new MenuValidationError("The source must be an Instagram post link.");
  }
  return {
    name, slug, price: MENU_PRICE, unit: "each", blurb: text("blurb", 160), description: text("description", 2000),
    image, active: input.active, bundle_eligible: input.bundle_eligible, sort_order: sortOrder,
    allergens: [...new Set(allergens)], badge: text("badge", 32), source_url: source,
    category: "everyday", icon: "i-cakepop", color: "#F285B5", tint: "242,133,181", badge_class: "", lead_time_hours: 72,
  };
}
