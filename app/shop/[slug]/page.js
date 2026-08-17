import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, getProducts } from "@/lib/products";
import { Icon } from "@/components/Icons";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import { money } from "@/lib/format";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Not found" };
  return { title: product.name, description: product.description || product.blurb };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const all = await getProducts();
  const related = all.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <>
      <section className="sec" style={{ paddingBottom: 40 }}>
        <div className="wrap">
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>
            <Link href="/shop">Shop</Link> <span aria-hidden="true">/</span> {product.name}
          </p>

          <div className="split">
            <div
              className="tile"
              style={{
                display: "grid", placeItems: "center", minHeight: 380,
                background: `linear-gradient(150deg,rgba(${product.tint},.24),rgba(${product.tint},.05))`,
              }}
            >
              <Icon name={product.icon} style={{ color: product.color, width: 190, height: 190 }} />
            </div>

            <div>
              {product.badge ? <div className="eyebrow">{product.badge}</div> : null}
              <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", marginTop: 10 }}>{product.name}</h1>
              <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 17 }}>
                {product.description || product.blurb}
              </p>

              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 22 }}>
                <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-.03em" }}>
                  {money(product.price)}
                </span>
                <span style={{ color: "var(--muted)" }}>{product.unit}</span>
              </div>

              <AddToCart product={product} />

              <ul className="checks" style={{ marginTop: 28 }}>
                <li><Icon name="i-check" /> Made within {product.leadTimeHours || 72} hours of pickup or delivery</li>
                <li><Icon name="i-check" /> Colors matched to your theme at no extra cost</li>
                <li><Icon name="i-check" /> Free local delivery on orders over $75</li>
              </ul>

              {product.allergens?.length ? (
                <p style={{ marginTop: 20, fontSize: 14, color: "var(--muted)" }}>
                  <strong>Contains:</strong> {product.allergens.join(", ")}. Made in a kitchen that
                  also handles nuts, dairy, eggs, wheat and soy.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <div className="sec-top"><div><h2 style={{ fontSize: 30 }}>You might also like</h2></div></div>
          <div className="grid">
            {related.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </div>
      </section>
    </>
  );
}
