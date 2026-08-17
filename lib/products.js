import { connectToDatabase, hasDatabase } from "./mongodb";
import Product from "./models/Product";
import { SAMPLE_PRODUCTS } from "./sample-data";
import { plain } from "./format";

/**
 * Reads go through the database when one is configured and reachable, and fall
 * back to the bundled sample list otherwise. That keeps the whole site
 * browsable before MongoDB Atlas is set up, and keeps it up if the database
 * blips, rather than throwing a 500 at a customer.
 */
export async function getProducts() {
  if (hasDatabase()) {
    const conn = await connectToDatabase();
    if (conn) {
      try {
        const docs = await Product.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
        if (docs.length) return docs.map(plain);
      } catch (err) {
        console.error("getProducts failed, using sample data:", err.message);
      }
    }
  }
  return SAMPLE_PRODUCTS.map((p) => ({ ...p }));
}

export async function getProduct(slug) {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) || null;
}

export async function getProductSlugs() {
  const all = await getProducts();
  return all.map((p) => p.slug);
}
