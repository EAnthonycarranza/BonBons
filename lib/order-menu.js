// Prices and flavor availability are always rebuilt from the current menu.
export function normalizeOrderItems(items, products) {
  if (!Array.isArray(items) || !items.length || items.length > 100) {
    throw new Error("Please choose between 1 and 100 order items.");
  }
  const menu = new Map(products.filter((p) => p.active !== false && !p.deletedAt).map((p) => [p.slug, p]));
  return items.map((item) => {
    if (!item || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 50) {
      throw new Error("Please choose a quantity between 1 and 50 for each item.");
    }
    const key = String(item.key || "");
    const product = menu.get(key);
    if (product) return {
      key, name: product.name, description: product.blurb,
      price: Number(product.price), qty: item.qty, bundleEligible: product.bundleEligible === true,
    };
    if (key.startsWith("box-4-")) {
      const flavors = item.flavors;
      if (!Array.isArray(flavors) || !flavors.length || flavors.length > 4 ||
          new Set(flavors.map((f) => f?.slug)).size !== flavors.length ||
          flavors.some((f) => !f || !Number.isInteger(f.qty) || f.qty < 1 || f.qty > 4 || !menu.get(f.slug)?.bundleEligible) ||
          flavors.reduce((n, f) => n + f.qty, 0) !== 4) {
        throw new Error("The menu has changed. Please remove this four-pack and build a new one with the available flavors.");
      }
      const confirmed = flavors.map((f) => ({ slug: f.slug, name: menu.get(f.slug).name, qty: f.qty }));
      return {
        key, name: "Cake Pop Four-Pack (4 pc)",
        description: confirmed.map((f) => `${f.name} x${f.qty}`).join(", "),
        price: 10, qty: item.qty, bundleEligible: false, flavors: confirmed,
      };
    }
    throw new Error("One of the requested flavors is no longer available. Please remove it and choose from the current menu.");
  });
}
