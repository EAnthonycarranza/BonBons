import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import ProductCard from "@/components/ProductCard";
import NewsletterForm from "@/components/NewsletterForm";
import SocialFeedAccordion from "@/components/SocialFeedAccordion";
import BakeryPhotoGallery from "@/components/BakeryPhotoGallery";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();
  const favorites = products
    .filter((p) => p.category === "everyday")
    .slice(0, 3);
  return (
    <>
      <section className="editorial-hero wrap">
        <div className="editorial-hero-copy rv-anim">
          <div className="eyebrow lined-label">
            Handmade cake pops · San Antonio
          </div>
          <h1>
            A little cake.
            <br />A lot of <em>joy.</em>
          </h1>
          <p>
            For your afternoon craving. For someone you love. Hand-rolled cake
            pops that make an ordinary day a little sweeter.
          </p>
          <div className="editorial-actions">
            <Link className="btn btn-pink" href="/shop">
              Find your favorite <span aria-hidden="true">↗</span>
            </Link>
            <Link className="text-link" href="/build-a-box">
              Build a four-pack <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="hero-price-note">
            <span>
              <b>$4</b> for one
            </span>
            <span>
              <b>$10</b> for a four-pack
            </span>
          </div>
        </div>
        <figure className="editorial-hero-photo rv-anim">
          <div className="hero-photo-arch">
            <Image
              src="/products/bonbons-assortment-styled.webp"
              alt="Styled image of Bon Bon’s individually wrapped cake pops with pink sprinkles, cookie crumbs, strawberry crunch, and chocolate toppings on a marble platter"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 52vw"
            />
          </div>
          <figcaption>
            <span>From Bonnie’s kitchen.</span>
            <span>01 / Styled photo of our cake pops</span>
          </figcaption>
          <Link
            href="/build-a-box"
            className="photo-stamp"
            aria-label="Build your own four-pack for $10"
          >
            <small>Mix your favorites</small>
            <b>4 for $10</b>
            <span aria-hidden="true">↗</span>
          </Link>
        </figure>
      </section>
      <div className="store-note wrap">
        <span>Hand-rolled &amp; hand-dipped</span>
        <span>One pop or a whole four-pack</span>
        <span>San Antonio pickup only</span>
      </div>
      <section className="sec menu-section">
        <div className="wrap">
          <div className="sec-top rv-anim">
            <div>
              <div className="eyebrow">The everyday collection</div>
              <h2>
                Meet your new <em>favorite.</em>
              </h2>
            </div>
            <Link className="text-link" href="/shop">
              Explore the menu <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <div className="grid home-product-grid">
            {favorites.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
          <p className="collection-note">
            A single sweet treat, no occasion needed. Choose a four-pack
            separately to enjoy four for $10.
          </p>
        </div>
      </section>
      <section className="wrap flavor-banner rv-anim">
        <Link href="/shop">
          <Image
            src="/products/bonbons-flavors-banner.webp"
            alt="Styled image of two Bon Bon’s flavors side by side: Cookie Monster and Strawberry Shortcake"
            width={2172}
            height={724}
            sizes="(max-width: 760px) 100vw, 1264px"
          />
        </Link>
      </section>
      <section className="wrap bundle-editorial rv-anim">
        <div className="bundle-photo">
          <Image
            src="/products/bonbons-four-pack-styled.png"
            alt="Styled four-pack with two Cookie Monster cake pops, one Strawberry Shortcake, and one Biscoff, based on Bon Bon’s photos"
            fill
            sizes="(max-width: 760px) 100vw, 50vw"
          />
        </div>
        <div className="bundle-copy">
          <div className="eyebrow">A little variety goes a long way</div>
          <h2>
            Four pops.
            <br />
            <em>Your kind of mix.</em>
          </h2>
          <p>
            All one favorite? A bit of everything? Choose any four flavors and make
            a box that is completely yours.
          </p>
          <div className="bundle-price">
            <b>$10</b>
            <span>
              four cake pops
              <br />
              save $6 compared with singles
            </span>
          </div>
          <Link className="btn btn-pink" href="/build-a-box">
            Make it your own <span aria-hidden="true">↗</span>
          </Link>
          <small>
            Singles stay $4 each. We never change your choice automatically.
          </small>
          <small className="photo-disclosure">AI-styled image based on our real cake-pop photos. Choose your own mix.</small>
        </div>
      </section>
      <section className="sec">
        <div className="wrap maker-teaser rv-anim">
          <figure className="maker-teaser-photo">
            <Image
              src="/images/bonnie-and-greg.jpg"
              alt="Bonnie and her husband Greg together"
              width={570}
              height={696}
              sizes="(max-width: 760px) 90vw, 38vw"
            />
            <figcaption>
              Bonnie &amp; Greg · The heart behind Bon Bon&apos;s
            </figcaption>
          </figure>
          <div className="maker-teaser-copy">
            <div className="eyebrow">From Bonnie&apos;s kitchen</div>
            <h2>
              Made with love.
              <br />
              <em>Rooted in faith.</em>
            </h2>
            <p>
              What began as Bonnie&apos;s love of baking for family and friends
              became a way to share her God-given gifts. With her husband Greg
              cheering her on, that love is at the heart of every cake pop.
            </p>
            <Link className="text-link" href="/about">
              Meet the people behind the pops <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </div>
      </section>
      <BakeryPhotoGallery />
      <section className="pickup-editorial">
        <div className="wrap">
          <div className="sec-top rv-anim">
            <div>
              <div className="eyebrow">From our kitchen to your hands</div>
              <h2>
                A sweet little <em>pickup.</em>
              </h2>
            </div>
            <p>
              Pickup only. Pay after confirmation.
              <br />
              Just a personal touch from start to finish.
            </p>
          </div>
          <div className="pickup-steps rv-anim">
            {[
              [
                "01",
                "Pick your pops",
                "Choose $4 singles or build a four-pack for $10. Mix and match the way you like.",
              ],
              [
                "02",
                "Send your request",
                "Tell us your preferred date and any notes. Bonnie will confirm the details with you.",
              ],
              [
                "03",
                "Swing by & enjoy",
                "Once confirmed, use our payment options link. Pick up at the agreed time and location.",
              ],
            ].map(([number, title, copy]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="sec">
        <div className="wrap">
          <SocialFeedAccordion />
        </div>
      </section>
      <section className="wrap newsletter-editorial rv-anim">
        <div>
          <div className="eyebrow">Something sweet is coming</div>
          <h2>
            Cake pops today.
            <br />
            <em>More to love tomorrow.</em>
          </h2>
          <p>Be the first to hear about new flavors and future treats.</p>
        </div>
        <div className="news">
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
