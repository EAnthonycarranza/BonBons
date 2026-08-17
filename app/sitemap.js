import { getProductSlugs } from "@/lib/products";
import { OCCASIONS } from "@/lib/sample-data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://bonbons.example.com";

export default async function sitemap() {
  const now = new Date();
  const staticRoutes = [
    "", "/shop", "/build-a-box", "/dessert-tables",
    "/occasions", "/about", "/faq", "/quote",
  ].map((p) => ({ url: `${BASE}${p}`, lastModified: now }));

  const slugs = await getProductSlugs();
  const products = slugs.map((s) => ({ url: `${BASE}/shop/${s}`, lastModified: now }));
  const occasions = OCCASIONS.map((o) => ({ url: `${BASE}/occasions/${o.slug}`, lastModified: now }));

  return [...staticRoutes, ...products, ...occasions];
}
