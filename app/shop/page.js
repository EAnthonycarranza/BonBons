import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export const metadata = {
  title: "Shop cake pops",
  description:
    "Shop $4 individual cake pops or choose a four-pack for $10. Custom and event orders are also available.",
};

export const dynamic = "force-dynamic";

const CATEGORY_LABELS = {
  everyday: "The everyday favorites",
  custom: "For something a little special",
};

export default async function ShopPage() {
  const products = await getProducts();
  const categories = [...new Set(products.map((p) => p.category))];

  return (
    <section className="sec">
      <div className="wrap">
        <div className="page-masthead rv-anim">
          <div>
            <div className="eyebrow">Shop</div>
            <h1>
              Good things come
              <br />
              on <em>little sticks.</em>
            </h1>
            <p>
              Cake pops are what we do. Pick a $4 single for yourself, or choose
              a $10 four-pack to mix your favorites. No special occasion
              necessary.
            </p>
            <Link className="text-link" href="/build-a-box">
              Build a $10 four-pack <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="page-masthead-photo">
            <Image
              src="/products/bonbons-real-pickup.jpg"
              alt="Bon Bon’s wrapped cake pops with colorful sprinkles and cookie-crumb toppings"
              fill
              priority
              sizes="280px"
            />
          </div>
        </div>

        {!products.length && <div className="b-card"><h2>The next batch is on its way.</h2><p>Check back for available cake pops, or contact Bonnie to ask what’s baking.</p></div>}
        {categories.map((cat) => (
          <div key={cat} style={{ marginBottom: 46 }}>
            <div className="category-heading">
              <h2>{CATEGORY_LABELS[cat] || cat}</h2>
              <span>
                {cat === "everyday"
                  ? "$4 each · selected four-pack $10"
                  : "Custom colors & event orders, by request"}
              </span>
            </div>
            <div
              className="grid live-menu-grid"
            >
              {products
                .filter((p) => p.category === cat)
                .map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
