import { SAMPLE_PRODUCTS } from "./sample-data";
import {
  createPublicSupabaseClient,
  hasSupabasePublicConfig,
  toProduct,
} from "./supabase-data";

/**
 * Supabase is authoritative, including an intentionally empty menu. Never
 * resurrect hidden/deleted flavors or accept unavailable items during outages.
 */
export async function getProducts() {
  if (hasSupabasePublicConfig()) {
    try {
      const supabase = createPublicSupabaseClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .is("deleted_at", null)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      // A blank image is an intentional CMS choice, not a request to restore
      // the starter photo after the owner removes it.
      return (data || []).map(toProduct);
    } catch (err) {
      console.error("The live menu is unavailable:", err.message);
      return [];
    }
  }
  return SAMPLE_PRODUCTS;
}

export async function getProduct(slug) {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) || null;
}

export async function getProductSlugs() {
  const all = await getProducts();
  return all.map((p) => p.slug);
}
