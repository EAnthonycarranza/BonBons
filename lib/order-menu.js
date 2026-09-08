import { stockState } from "../supabase/functions/_shared/menu.js";
import { DEFAULT_FOUR_PACK_PRICE, isWeeklyBoxKey, weeklyBoxCartKey } from "./weekly-box.js";

// A tracked item can only be requested up to what is actually left.
function assertAvailable(name, quantity, stock) {
  const availability = stockState(stock?.quantity, stock?.threshold);
  if (availability.state === "sold_out") {
    throw new Error(`${name} is sold out. Please remove it from your request.`);
  }
  if (availability.tracked && quantity > availability.remaining) {
    throw new Error(`Only ${availability.remaining} of ${name} ${availability.remaining === 1 ? "is" : "are"} left. Please lower the quantity.`);
  }
}

/**
 * Prices, availability and flavor names are always rebuilt from the current
 * menu, so nothing the browser sends can change what an order costs.
 */
export function normalizeOrderItems(items, products, options = {}) {
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new Error("Please choose between 1 and 100 order items.");
  }
  const fourPackPrice = Number(options.fourPackPrice) > 0 ? Number(options.fourPackPrice) : DEFAULT_FOUR_PACK_PRICE;
  const weeklyBox = options.weeklyBox || null;
  const menu = new Map(products.filter((p) => p.active !== false && !p.deletedAt).map((p) => [p.slug, p]));

  return items.map((item) => {
    if (!item || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 50) {
      throw new Error("Please choose a quantity between 1 and 50 for each item.");
    }
    const key = String(item.key || "");
    const product = menu.get(key);
    if (product) {
      assertAvailable(product.name, item.qty, { quantity: product.stockQuantity, threshold: product.lowStockThreshold });
      return {
        key, name: product.name, description: product.blurb,
        price: Number(product.price), qty: item.qty, bundleEligible: product.bundleEligible === true,
      };
    }

    if (isWeeklyBoxKey(key)) {
      if (!weeklyBox || !weeklyBox.active || weeklyBoxCartKey(weeklyBox) !== key) {
        throw new Error("This week's box is no longer available. Please remove it from your request.");
      }
      assertAvailable(weeklyBox.title, item.qty, { quantity: weeklyBox.stockQuantity, threshold: weeklyBox.lowStockThreshold });
      return {
        key, name: weeklyBox.title,
        description: weeklyBox.items.map((entry) => entry.name).join(", "),
        price: Number(weeklyBox.price), qty: item.qty, bundleEligible: false,
      };
    }

    if (key.startsWith("box-4-")) {
      const flavors = item.flavors;
      if (!Array.isArray(flavors) || !flavors.length || flavors.length > 4 ||
          new Set(flavors.map((f) => f?.slug)).size !== flavors.length ||
          flavors.some((f) => !f || !Number.isInteger(f.qty) || f.qty < 1 || f.qty > 4 || !menu.get(f.slug)?.bundleEligible) ||
          flavors.reduce((n, f) => n + f.qty, 0) !== 4) {
        throw new Error("The menu has changed. Please remove this four-pack and build a new one with the available flavors.");
      }
      // Each flavor must cover every pop across every pack being requested.
      for (const flavor of flavors) {
        const source = menu.get(flavor.slug);
        assertAvailable(source.name, flavor.qty * item.qty, { quantity: source.stockQuantity, threshold: source.lowStockThreshold });
      }
      const confirmed = flavors.map((f) => ({ slug: f.slug, name: menu.get(f.slug).name, qty: f.qty }));
      return {
        key, name: "Cake Pop Four-Pack (4 pc)",
        description: confirmed.map((f) => `${f.name} x${f.qty}`).join(", "),
        price: fourPackPrice, qty: item.qty, bundleEligible: false, flavors: confirmed,
      };
    }
    throw new Error("One of the requested flavors is no longer available. Please remove it and choose from the current menu.");
  });
}
