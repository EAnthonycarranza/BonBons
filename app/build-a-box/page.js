import BoxBuilder from "@/components/BoxBuilder";
import Image from "next/image";
import { getProducts } from "@/lib/products";

export const metadata = {
  title: "Build a four-pack",
  description:
    "Choose a $10 four-pack and mix four cake pop flavors for arranged pickup.",
};

export const dynamic = "force-dynamic";

export default async function BuildABoxPage() {
  const products = (await getProducts()).filter((product) => product.bundleEligible);
  return (
    <section className="light flat sec">
      <div className="wrap">
        <div className="page-masthead rv-anim">
          <div>
            <div className="eyebrow">Any 4 for $10</div>
            <h1>
              Four little pops.
              <br />
              <em>Made your way.</em>
            </h1>
            <p>
              Choose four cake pops in any mix of flavors. All one favorite or
              one of each—it is up to you.
            </p>
            <small className="photo-disclosure">AI-styled photos based on our real cake pops. Handmade finishes may vary.</small>
          </div>
          <div className="page-masthead-photo">
            <Image
              src="/products/bonbons-four-pack-styled.png"
              alt="Styled four-pack based on Bon Bon’s Cookie Monster, Strawberry Shortcake, and Biscoff cake pops"
              fill
              priority
              sizes="280px"
            />
          </div>
        </div>
        <BoxBuilder key={products.map((p) => p.slug).join(",")} products={products} />
      </div>
    </section>
  );
}
