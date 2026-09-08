// Shared by the website and the authenticated Edge Function. No browser-only
// validation: the same rules apply at the database boundary.
export class MenuValidationError extends Error {}

// Kept as the default for new flavors; the owner can now price each item.
export const MENU_PRICE = 4;
export const MAX_ITEM_PRICE = 500;
export const MAX_STOCK = 100000;
export const DEFAULT_LOW_STOCK_THRESHOLD = 3;
export const MENU_IMAGE_BUCKET = "menu-photos";
export const MENU_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MENU_ALLERGENS = ["milk", "eggs", "wheat", "soy", "peanuts", "tree nuts", "sesame", "dairy"];

// A money amount the owner typed: a positive number of whole cents.
export function assertPrice(value, label = "Price") {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_ITEM_PRICE) {
    throw new MenuValidationError(`${label} must be between $0.01 and $${MAX_ITEM_PRICE}.00.`);
  }
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) {
    throw new MenuValidationError(`${label} can only go to the cent.`);
  }
  return Math.round(value * 100) / 100;
}

// null/undefined means "not tracked" — made to order, always available.
export function assertStock(value, label = "Quantity") {
  if (value === null || value === undefined || value === "") return null;
  if (!Number.isInteger(value) || value < 0 || value > MAX_STOCK) {
    throw new MenuValidationError(`${label} must be a whole number from 0 to ${MAX_STOCK}, or blank for made to order.`);
  }
  return value;
}

export function assertThreshold(value) {
  const threshold = value ?? DEFAULT_LOW_STOCK_THRESHOLD;
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000) {
    throw new MenuValidationError("The low-stock warning must be a whole number from 0 to 1000.");
  }
  return threshold;
}

/**
 * How a shopper should see an item's availability.
 * `tracked: false` keeps every made-to-order flavor behaving exactly as before.
 */
export function stockState(quantity, threshold = DEFAULT_LOW_STOCK_THRESHOLD) {
  if (quantity === null || quantity === undefined) return { tracked: false, state: "available", remaining: null };
  const remaining = Number(quantity);
  if (!Number.isFinite(remaining) || remaining <= 0) return { tracked: true, state: "sold_out", remaining: 0 };
  const limit = Number(threshold);
  if (Number.isFinite(limit) && limit > 0 && remaining <= limit) return { tracked: true, state: "low", remaining };
  return { tracked: true, state: "available", remaining };
}

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
  const price = assertPrice(input.price, "The cake-pop price");
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
    name, slug, price, unit: "each", blurb: text("blurb", 160), description: text("description", 2000),
    image, active: input.active, bundle_eligible: input.bundle_eligible, sort_order: sortOrder,
    allergens: [...new Set(allergens)], badge: text("badge", 32), source_url: source,
    stock_quantity: assertStock(input.stock_quantity), low_stock_threshold: assertThreshold(input.low_stock_threshold),
    category: "everyday", icon: "i-cakepop", color: "#F285B5", tint: "242,133,181", badge_class: "", lead_time_hours: 72,
  };
}

export const MAX_BOX_ITEMS = 40;
export const MAX_BOX_ITEM_QTY = 99;

/** Total cake pops in a box, counting multiples. */
export function boxPopCount(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => total + (Number(item?.qty) || 0), 0);
}

export function validateWeeklyBox(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MenuValidationError("Enter the box details.");
  function text(key, limit, required = false, label = key) {
    const value = input[key] ?? "";
    if (typeof value !== "string" || value.trim().length > limit || (required && !value.trim())) {
      throw new MenuValidationError(`${label} must be ${required ? "1–" : "no more than "}${limit} characters.`);
    }
    return value.trim();
  }
  const title = text("title", 90, true, "The box name");
  const slug = text("slug", 100, true, "The box link");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new MenuValidationError("Use only lowercase letters, numbers, and single hyphens in the box link.");
  if (typeof input.active !== "boolean" || typeof input.featured !== "boolean") throw new MenuValidationError("Choose whether the box is published and whether it is this week's box.");
  const image = text("image", 1000);
  if (!isMenuImageUrl(image)) throw new MenuValidationError("Upload a JPG, PNG, or WebP photo using the photo picker.");

  // Each line points at a menu flavor and carries its own quantity, so a box
  // can hold several of the same pop. The name is snapshotted alongside the
  // slug so an old box still reads correctly if a flavor is later renamed.
  const items = input.items ?? [];
  if (!Array.isArray(items) || !items.length) throw new MenuValidationError("Add at least one cake pop to the box.");
  if (items.length > MAX_BOX_ITEMS) throw new MenuValidationError(`A box can list up to ${MAX_BOX_ITEMS} different flavors.`);
  const seen = new Set();
  const cleanItems = items.map((entry) => {
    const value = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    const slug = String(value.slug ?? "").trim();
    const name = String(value.name ?? "").trim();
    const note = String(value.note ?? "").trim();
    const qty = value.qty;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
      throw new MenuValidationError("Choose each item from the cake-pop menu.");
    }
    if (seen.has(slug)) throw new MenuValidationError("Each flavor can only be listed once — use its quantity for multiples.");
    seen.add(slug);
    if (!name || name.length > 80) throw new MenuValidationError("Each item in the box needs a name of 1–80 characters.");
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_BOX_ITEM_QTY) {
      throw new MenuValidationError(`Each flavor's quantity must be a whole number from 1 to ${MAX_BOX_ITEM_QTY}.`);
    }
    if (note.length > 160) throw new MenuValidationError("Item notes must be no more than 160 characters.");
    return { slug, name, qty, note };
  });

  // A limited run must have a real count, so this one is required, not nullable.
  const stock = input.stock_quantity;
  if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
    throw new MenuValidationError(`Boxes remaining must be a whole number from 0 to ${MAX_STOCK}.`);
  }
  return {
    slug, title, tagline: text("tagline", 160), description: text("description", 2000),
    price: assertPrice(input.price, "The box price"), stock_quantity: stock,
    low_stock_threshold: assertThreshold(input.low_stock_threshold),
    items: cleanItems, image, featured: input.featured, active: input.active,
  };
}

export function validateShopSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new MenuValidationError("Enter the shop prices.");
  return {
    single_pop_price: assertPrice(input.single_pop_price, "The single cake-pop price"),
    four_pack_price: assertPrice(input.four_pack_price, "The four-pack price"),
  };
}
