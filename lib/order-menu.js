import { stockState } from "../supabase/functions/_shared/menu.js";
import { DEFAULT_FOUR_PACK_PRICE, isWeeklyBoxKey, weeklyBoxCartKey } from "./weekly-box.js";
import { BUNDLE_GROUPS, bundleGroupForCartKey, bundleGroupForCategory, bundlePrices, getBundleGroup } from "./bundles.js";

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
        bundleGroup: bundleGroupForCategory(product.category),
      };
    }

    if (isWeeklyBoxKey(key)) {
      if (!weeklyBox || !weeklyBox.active || weeklyBoxCartKey(weeklyBox) !== key) {
        throw new Error("This week's box is no longer available. Please remove it from your request.");
      }
      assertAvailable(weeklyBox.title, item.qty, { quantity: weeklyBox.stockQuantity, threshold: weeklyBox.lowStockThreshold });
      return {
        key, name: weeklyBox.title,
        description: weeklyBox.items.map((entry) => `${entry.name}${Number(entry.qty) > 1 ? ` x${entry.qty}` : ""}`).join(", "),
        price: Number(weeklyBox.price), qty: item.qty, bundleEligible: false,
      };
    }

    const packGroupKey = bundleGroupForCartKey(key);
    if (packGroupKey) {
      const group = getBundleGroup(packGroupKey);
      const { pack: packPrice } = bundlePrices(packGroupKey, { ...options, fourPackPrice });
      const flavors = item.flavors;
      const belongs = (slug) => {
        const source = menu.get(slug);
        return source?.bundleEligible && bundleGroupForCategory(source.category) === group.key;
      };
      if (!Array.isArray(flavors) || !flavors.length || flavors.length > group.size ||
          new Set(flavors.map((f) => f?.slug)).size !== flavors.length ||
          flavors.some((f) => !f || !Number.isInteger(f.qty) || f.qty < 1 || f.qty > group.size || !belongs(f.slug)) ||
          flavors.reduce((n, f) => n + f.qty, 0) !== group.size) {
        throw new Error(`The menu has changed. Please remove this ${group.packName} and build a new one with the available flavors.`);
      }
      // Each flavor must cover every unit across every pack being requested.
      for (const flavor of flavors) {
        const source = menu.get(flavor.slug);
        assertAvailable(source.name, flavor.qty * item.qty, { quantity: source.stockQuantity, threshold: source.lowStockThreshold });
      }
      const confirmed = flavors.map((f) => ({ slug: f.slug, name: menu.get(f.slug).name, qty: f.qty }));
      return {
        key, name: group.orderName,
        description: confirmed.map((f) => `${f.name} x${f.qty}`).join(", "),
        price: packPrice, qty: item.qty, bundleEligible: false, flavors: confirmed,
      };
    }

    throw new Error("One of the requested flavors is no longer available. Please remove it and choose from the current menu.");
  });
}
