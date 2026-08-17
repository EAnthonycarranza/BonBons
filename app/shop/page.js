import Link from "next/link";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export const metadata = {
  title: "Shop treats",
  description: "Dipped strawberries, cake pops, custom cookies, candy apples and more — made to order.",
};

export default async function ShopPage() {
  const products = await getProducts();
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Shop</div>
            <h2>Every treat we make</h2>
            <p>
              Everything is hand-finished and made within 72 hours of your pickup or
              delivery. Need something that isn&apos;t here? <Link href="/quote" style={{ textDecoration: "underline" }}>Ask for a quote</Link>.
            </p>
          </div>
          <Link className="btn btn-ghost" href="/build-a-box">Build your own box →</Link>
        </div>

        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 46 }}>
            <h3 style={{ fontSize: 20, marginBottom: 18, textTransform: "capitalize" }}>{cat}</h3>
            <div className="grid">
              {products.filter((p) => p.category === cat).map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
