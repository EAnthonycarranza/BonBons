import Link from "next/link";
import Image from "next/image";
import { getProducts } from "@/lib/products";
import { Icon, Stars } from "@/components/Icons";
import ProductCard from "@/components/ProductCard";
import ZipChecker from "@/components/ZipChecker";
import NewsletterForm from "@/components/NewsletterForm";
import { OCCASIONS } from "@/lib/sample-data";

const SPRINKLES = [
  { left: "8%", top: "15%", size: 9, color: "var(--gold)" },
  { left: "19%", top: "40%", size: 7, color: "var(--blue)" },
  { left: "71%", top: "21%", size: 8, color: "var(--pink)" },
  { left: "88%", top: "55%", size: 6, color: "var(--gold)" },
  { left: "45%", top: "10%", size: 7, color: "var(--purple)" },
];

const MARQUEE = [
  "Dipped Strawberries", "Cake Pops", "Custom Cookies", "Candy Apples",
  "Cocoa Bombs", "Party Favors", "Dessert Tables",
];

const REVIEWS = [
  { quote: "The dessert table was the first thing every single guest photographed. It matched our colors exactly.",
    name: "Marisol R.", role: "Quinceañera", initials: "MR", color: "var(--pink)" },
  { quote: "120 logo cookies with five days notice for a client event. They nailed it and delivered early.",
    name: "Dana W.", role: "Corporate launch", initials: "DW", color: "var(--blue)" },
  { quote: "Best strawberries I've had, and I order a lot of them. The drizzle work is genuinely art.",
    name: "Kevin A.", role: "Repeat customer", initials: "KA", color: "var(--purple)" },
];

export default async function HomePage() {
  const products = await getProducts();
  const featured = products.slice(0, 4);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="wrap">
          <div className="glow" style={{ width: 520, height: 520, background: "#FF2E9A", left: -130, top: -90 }} />
          <div className="glow" style={{ width: 440, height: 440, background: "#3B9BFF", right: -110, top: 130 }} />

          <div className="bento">
            <div className="tile t-main">
              <div className="sprinkles">
                {SPRINKLES.map((s, i) => (
                  <i key={i} style={{ left: s.left, top: s.top, width: s.size, height: s.size, background: s.color }} />
                ))}
              </div>
              <div className="eyebrow">Handmade · Made to order · Pickup or delivery</div>
              <h1>Desserts that make the <span>party</span> unforgettable.</h1>
              <p>
                Dipped strawberries, cake pops, custom cookies and full dessert tables —
                built around your colors, your theme, your date.
              </p>
              <div className="hero-cta">
                <Link className="btn btn-pink" href="/shop">Shop Treats</Link>
                <Link className="btn btn-ghost" href="/build-a-box">Build Your Own Box</Link>
              </div>
              <div className="trust">
                <div><Icon name="i-check" /> 300+ celebrations</div>
                <div><Icon name="i-check" /> Made fresh, never frozen</div>
                <div><Icon name="i-check" /> Allergy notes on every order</div>
              </div>
            </div>

            <div className="hero-side">
              <div className="tile t-logo">
                <Image src="/logo-transparent.png" alt="Bon Bon's Sweets & More"
                  width={660} height={660} priority style={{ maxWidth: 330, height: "auto" }} />
              </div>
              <div className="mini-row">
                <div className="mini">
                  <Stars label="4.9 out of 5 stars" />
                  <div className="k pink">4.9</div>
                  <div className="v">from 312 reviews</div>
                </div>
                <div className="mini">
                  <div className="k blue">72h</div>
                  <div className="v">Typical turnaround on custom orders</div>
                </div>
              </div>
              <ZipChecker />
            </div>
          </div>

          <div className="mq">
            <div className="mq-track" aria-hidden="true">
              {[0, 1].map((dup) => (
                <span key={dup}>
                  {MARQUEE.map((m) => (
                    <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 32 }}>
                      {m} <Icon name="i-sparkle" />
                    </span>
                  ))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FEATURED ---------- */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-top rv-anim">
            <div>
              <div className="eyebrow">Shop</div>
              <h2>Grab &amp; go favorites</h2>
              <p>Ready-made boxes you can add to your cart right now — no consultation needed.</p>
            </div>
            <Link className="btn btn-ghost" href="/shop">See all treats →</Link>
          </div>
          <div className="grid">
            {featured.map((p) => <ProductCard key={p.slug} product={p} />)}
          </div>
        </div>
      </section>

      {/* ---------- LIGHT BLOCK ---------- */}
      <section className="light">
        <div className="wrap sec">
          <div className="sec-top rv-anim">
            <div>
              <div className="eyebrow">Build a box</div>
              <h2>Mix your own, price as you go</h2>
              <p>Pick a box size, choose your treats, and watch the total update as you build.</p>
            </div>
            <Link className="btn btn-dark" href="/build-a-box">Start building →</Link>
          </div>

          <div className="steps rv-anim">
            <div className="step">
              <h3>Tell us the details</h3>
              <p>Your date, colors, theme and headcount — a short form, about a minute.</p>
            </div>
            <div className="step">
              <h3>We quote &amp; confirm</h3>
              <p>A mockup and price, usually back the same business day. A deposit locks your date.</p>
            </div>
            <div className="step">
              <h3>Pickup or delivery</h3>
              <p>Collect at an arranged time, or we deliver locally and set the table up for you.</p>
            </div>
          </div>
        </div>

        <div className="wrap sec" style={{ paddingTop: 0 }}>
          <div className="sec-top rv-anim">
            <div><div className="eyebrow">Occasions</div><h2>Built for the day that matters</h2></div>
          </div>
          <div className="occ rv-anim">
            {OCCASIONS.slice(0, 3).map((o, i) => (
              <Link key={o.slug} className={`oc oc-${i + 1}`} href={`/occasions/${o.slug}`}>
                <div>
                  <h3>{o.title}</h3>
                  <p>{o.short}</p>
                </div>
                <span className="go">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- DESSERT TABLES ---------- */}
      <section className="sec dark-cap" style={{ background: "var(--bg)" }}>
        <div className="wrap">
          <div className="split">
            <div className="rv-anim">
              <div className="eyebrow">Dessert tables</div>
              <h2>We deliver it, style it, and clear it away.</h2>
              <p>
                You pick the palette and the vibe. We arrive early, build the display, and
                come back for the stands so you never think about it again.
              </p>
              <ul className="checks">
                <li><Icon name="i-check" /> Custom color matching from your invitation or swatches</li>
                <li><Icon name="i-check" /> Stands, risers, linens and signage included</li>
                <li><Icon name="i-check" /> On-site setup and same-night teardown</li>
                <li><Icon name="i-check" /> Serves 20 to 300 guests</li>
              </ul>
              <div className="hero-cta">
                <Link className="btn btn-pink" href="/dessert-tables">See how it works</Link>
              </div>
            </div>
            <div className="gal rv-anim" aria-label="Dessert table examples">
              {[
                ["255,46,154", "#FF5FA8", "i-cupcake"],
                ["165,92,255", "#B87CFF", "i-cakepop"],
                ["255,211,78", "#D9A35F", "i-cookie"],
                ["59,155,255", "#6FB6FF", "i-favor"],
                ["63,217,164", "#5FE0B6", "i-krispie"],
              ].map(([tint, color, icon]) => (
                <div key={icon} style={{ background: `linear-gradient(150deg,rgba(${tint},.26),rgba(${tint},.05))` }}>
                  <Icon name={icon} style={{ color }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ---------- REVIEWS ---------- */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-top rv-anim">
            <div><div className="eyebrow">Reviews</div><h2>What customers say</h2></div>
          </div>
          <div className="rv-head rv-anim">
            <div className="rv-score">
              <div className="n">4.9</div>
              <div>
                <Stars label="4.9 out of 5 stars" />
                <div className="sub">312 reviews · 300+ celebrations</div>
              </div>
            </div>
          </div>
          <div className="reviews rv-anim">
            {REVIEWS.map((r) => (
              <article className="rv" key={r.name}>
                <Stars label="5 out of 5" />
                <p>&ldquo;{r.quote}&rdquo;</p>
                <div className="who">
                  <div className="av" style={{ background: r.color }}>{r.initials}</div>
                  <div><b>{r.name}</b><span>{r.role}</span></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- NEWSLETTER ---------- */}
      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="news rv-anim">
            <div className="eyebrow">Stay in touch</div>
            <h2 style={{ marginTop: 12 }}>First look at seasonal boxes</h2>
            <p>Monthly notes on new flavors, holiday collections, and when the booking calendar opens.</p>
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
