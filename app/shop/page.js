import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";

export async function generateMetadata() {
  const { singlePopPrice, fourPackPrice } = await getShopSettings();
  return {
    title: "Shop cake pops",
    description: `Shop ${money(singlePopPrice)} individual cake pops or choose a four-pack for ${money(fourPackPrice)}. Custom and event orders are also available.`,
  };
}

export const dynamic = "force-dynamic";

const CATEGORY_LABELS = {
  everyday: "The everyday favorites",
  custom: "For something a little special",
  "pretzel-rods": "Pretzel rods",
};

// Categories come back in whatever order the menu is sorted; keep the cake pops
// first so the shop still opens on what it is known for.
const CATEGORY_ORDER = ["everyday", "pretzel-rods", "custom"];

export default async function ShopPage() {
  const { singlePopPrice, fourPackPrice, pretzelRodPrice, pretzelPairPrice } = await getShopSettings();
  const singleLabel = money(singlePopPrice);
  const packLabel = money(fourPackPrice);
  const rodLabel = money(pretzelRodPrice);
  const pairLabel = money(pretzelPairPrice);

  const products = await getProducts();
  const categories = [...new Set(products.map((p) => p.category))].sort((a, b) => {
    const rank = (c) => (CATEGORY_ORDER.indexOf(c) === -1 ? CATEGORY_ORDER.length : CATEGORY_ORDER.indexOf(c));
    return rank(a) - rank(b);
  });

  const categoryNote = (cat) => {
    if (cat === "everyday") return `${singleLabel} each · selected four-pack ${packLabel}`;
    if (cat === "pretzel-rods") return `${rodLabel} each · 2 for ${pairLabel}`;
    return "Custom colors & event orders, by request";
  };

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
              Cake pops are what we do. Pick a {singleLabel} single for yourself, or choose
              a {packLabel} four-pack to mix your favorites. Chocolate-dipped pretzel
              rods are here too, {rodLabel} each or 2 for {pairLabel}. No special
              occasion necessary.
            </p>
            <Link className="text-link" href="/build-a-box">
              Build a {packLabel} four-pack <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="page-masthead-photo">
            <Image
              src="/products/bonbons-assortment-styled.webp"
              alt="Styled image of a marble plate of Bon Bon’s wrapped cake pops in sprinkle, cookie-crumb, strawberry, and cookies-and-cream finishes"
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
              <span>{categoryNote(cat)}</span>
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
