import "../shop.css";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/products";
import { Icon } from "@/components/Icons";
import { isCakePopProduct } from "@/lib/bundles";
import AddToCart from "@/components/AddToCart";

export const dynamic = "force-dynamic";
import ProductCard from "@/components/ProductCard";
import { money } from "@/lib/format";
import { isStyledProductPhoto, isProductFlyer } from "@/lib/product-photos";
import { getShopSettings } from "@/lib/weekly-box-data";
import { isMysteryBag, bagContents } from "@/lib/product-offerings";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description || product.blurb,
  };
}

export default async function ProductPage({ params }) {
  const { singlePopPrice, treatPairPrice, fourPackPrice } =
    await getShopSettings();
  const singleLabel = money(singlePopPrice);
  const packLabel = money(treatPairPrice);

  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const all = await getProducts();
  const related = all.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <>
      <section className="sec product-detail" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <p className="product-breadcrumb">
            <Link href="/shop">Shop</Link> <span aria-hidden="true">/</span>{" "}
            {product.name}
          </p>

          <div className="split">
            <div
              className={`tile product-detail-media rv-anim${isProductFlyer(product.image) ? " is-flyer" : ""}`}
              style={{
                display: "grid",
                placeItems: "center",
                minHeight: 380,
                background: `linear-gradient(150deg,rgba(${product.tint},.24),rgba(${product.tint},.05))`,
              }}
            >
              {product.image ? (
                <Image
                  src={product.image}
                  alt={
                    isProductFlyer(product.image)
                      ? `${product.name} flyer`
                      : `${isStyledProductPhoto(product.image) ? "Styled image of " : ""}${product.name}`
                  }
                  fill
                  priority
                  sizes="(max-width: 980px) 100vw, 50vw"
                />
              ) : (
                <div className="flavor-photo-pending">
                  <Image
                    src="/logo-transparent.png"
                    alt="Bon Bon's Sweets & More"
                    width={180}
                    height={180}
                  />
                  <span>Product photo coming soon</span>
                </div>
              )}
            </div>

            <div className="product-detail-copy rv-anim">
              {product.badge ? (
                <div className="eyebrow">{product.badge}</div>
              ) : null}
              <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", marginTop: 10 }}>
                {product.name}
              </h1>
              <p className="product-detail-description">
                {product.description || product.blurb}
              </p>
              {isStyledProductPhoto(product.image) && (
                <p className="photo-disclosure">
                  AI-styled image based on Bon Bon’s real cake-pop photos.
                  Handmade finishes may vary.{" "}
                  <Link href="/#from-the-kitchen">See our bakery photos</Link>.
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginTop: 22,
                }}
              >
                <span
                  style={{
                    fontSize: 34,
                    fontWeight: 800,
                    letterSpacing: "-.03em",
                  }}
                >
                  {money(product.price)}
                </span>
                <span className="product-detail-unit">{product.unit}</span>
              </div>

              <section id="ingredients" className="product-ingredients">
                <h2>Ingredients</h2>
                <p style={{ whiteSpace: "pre-line" }}>
                  {product.ingredients ||
                    "Ingredients have not been listed yet. Please contact Bonnie for this product’s ingredients."}
                </p>
              </section>
              <AddToCart product={product} />
              <p
                style={{
                  marginTop: 12,
                  color: "var(--mint)",
                  fontSize: 13.5,
                  fontWeight: 700,
                }}
              >
                {isMysteryBag(product)
                  ? `One mystery bag includes ${bagContents(product)}. Bon Bon chooses the assortment.`
                  : product.unitCount > 1 || !product.bundleEligible
                    ? `Sold as ${product.unitCount > 1 ? `a batch of ${product.unitCount} ${product.unitLabel}` : "an individual item"} at the price above.`
                    : isCakePopProduct(product)
                      ? `Choose two cake pops for ${packLabel}, or mix four treats for ${money(fourPackPrice)}.`
                      : `Mix four treats for ${money(fourPackPrice)}.`}
                {product.unitCount === 1 && product.bundleEligible
                  ? " Maximum 1 rice crispy treat and 2 Oreos per mixed pack."
                  : ""}
              </p>

              <ul className="checks" style={{ marginTop: 28 }}>
                <li>
                  <Icon name="i-check" /> {money(product.price)}{" "}
                  {product.unit || "each"}
                </li>
                <li>
                  <Icon name="i-check" />{" "}
                  {isMysteryBag(product)
                    ? `${bagContents(product)} in every bag`
                    : product.unitCount > 1
                      ? `${product.unitCount} ${product.unitLabel} in every batch`
                      : product.bundleEligible
                        ? `Mix four eligible treats for ${money(fourPackPrice)}`
                        : "Priced individually"}
                </li>
                <li>
                  <Icon name="i-check" /> No event or large order required
                </li>
                <li>
                  <Icon name="i-check" />{" "}
                  {isMysteryBag(product)
                    ? "Flavors are a surprise selected by Bon Bon"
                    : "Custom colors available when you want them"}
                </li>
                <li>
                  <Icon name="i-check" /> Pay through our payment link after
                  Bonnie confirms the details
                </li>
              </ul>

              {product.allergens?.length ? (
                <p className="product-allergens">
                  <strong>Contains:</strong> {product.allergens.join(", ")}.
                  Made in a kitchen that also handles nuts, dairy, eggs, wheat
                  and soy.
                </p>
              ) : (
                <p className="product-allergens">
                  Please contact Bonnie about ingredients and allergens before
                  ordering. Our kitchen handles milk, eggs, wheat, soy, and
                  nuts; no flavor is guaranteed allergen-free.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="sec product-detail-related"
        style={{ paddingTop: 20 }}
      >
        <div className="wrap">
          <div className="sec-top">
            <div>
              <h2 style={{ fontSize: 30 }}>You might also like</h2>
            </div>
          </div>
          <div className="grid">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
