import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import { getShopSettings } from "@/lib/weekly-box-data";
import { money } from "@/lib/format";
import { isCakePopProduct, MIXED_PACK_RULE } from "@/lib/bundles";
import { categoryName } from "@/lib/menu-categories";
import "./shop.css";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const { singlePopPrice, treatPairPrice, fourPackPrice } =
    await getShopSettings();
  return {
    title: "Shop handmade treats",
    description: `Browse Bon Bon’s current handmade treats, ingredients, batch sizes, and prices. Cake pops ${money(singlePopPrice)} each or 2 for ${money(treatPairPrice)}. Mix four eligible individual treats for ${money(fourPackPrice)}. ${MIXED_PACK_RULE}`,
  };
}
export default async function ShopPage() {
  const [products, settings] = await Promise.all([
    getProducts(),
    getShopSettings(),
  ]);
  const singleLabel = money(settings.singlePopPrice),
    pairLabel = money(settings.treatPairPrice),
    mixedLabel = money(settings.fourPackPrice);
  const categories = [
    ...new Set(products.map((product) => product.category)),
  ].sort(
    (a, b) =>
      (products.find((product) => product.category === a)?.categoryOrder || 0) -
      (products.find((product) => product.category === b)?.categoryOrder || 0),
  );
  const shelfName = (category) =>
    categoryName(products.find((product) => product.category === category));
  return (
    <section className="sec">
      <div className="wrap">
        <div className="page-masthead rv-anim">
          <div>
            <div className="eyebrow">The treat shop</div>
            <h1>
              A little crunch.
              <br />A lot of <em>sweet.</em>
            </h1>
            <p>
              Handmade favorites and fresh batches, all in one place. Cake pops
              are {singleLabel} each or 2 for {pairLabel}. Mix four eligible
              individual treats for {mixedLabel}. {MIXED_PACK_RULE} Batch sizes and prices are listed
              with each product.
            </p>
            <Link className="text-link" href="/build-a-box">
              Mix & match 4 for {mixedLabel} <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="page-masthead-photo">
            <Image
              src="/products/bonbons-assortment-styled.webp"
              alt="Styled assortment of Bon Bon's wrapped cake pops"
              fill
              priority
              sizes="280px"
            />
          </div>
        </div>
        <nav className="treat-category-nav" aria-label="Treat categories">
          {categories.map((category) => (
            <a key={category} href={`#${category}`}>
              {shelfName(category)}
            </a>
          ))}
        </nav>
        {!products.length && (
          <div className="b-card">
            <h2>The next batch is on its way.</h2>
            <p>
              Check back for available treats, or contact Bonnie to ask what’s
              baking.
            </p>
          </div>
        )}
        {categories.map((category) => (
          <section
            className="treat-category"
            id={category}
            key={category}
            aria-labelledby={`${category}-heading`}
          >
            <div className="category-heading">
              <h2 id={`${category}-heading`}>{shelfName(category)}</h2>
              <span>
                {products.some(
                  (product) =>
                    product.category === category &&
                    isCakePopProduct(product) &&
                    Number(product.unitCount || 1) === 1,
                )
                  ? `${singleLabel} each · 2 for ${pairLabel} · 4 for ${mixedLabel}`
                  : "Prices and selling quantities below"}
              </span>
            </div>
            <div className="grid live-menu-grid">
              {products
                .filter((product) => product.category === category)
                .map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
