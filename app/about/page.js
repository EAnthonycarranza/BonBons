import Link from "next/link";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { SITE } from "@/lib/sample-data";

export const metadata = {
  title: "About",
  description: "Small-batch, made to order, and finished by hand. The story behind Bon Bon's Sweets & More.",
};

export default function AboutPage() {
  return (
    <>
      <section className="sec">
        <div className="wrap split">
          <div>
            <div className="eyebrow">Our story</div>
            <h1 style={{ fontSize: "clamp(32px,4.6vw,52px)", marginTop: 12 }}>
              It started at a kitchen table.
            </h1>
            <p style={{ color: "var(--muted)", marginTop: 16, fontSize: 17.5 }}>
              The first batch was a dozen dipped strawberries for a daughter&apos;s birthday.
              Friends asked for their own. Then friends of friends. Three hundred
              celebrations later, every box still gets made the same way — by hand, in
              small batches, the week you need it.
            </p>
            <p style={{ color: "var(--muted)", marginTop: 14, fontSize: 17.5 }}>
              We don&apos;t keep a freezer full of stock. Nothing is made until it&apos;s ordered,
              which is why we ask for 72 hours, and why it tastes like it does.
            </p>
            <div className="hero-cta">
              <Link className="btn btn-pink" href="/quote">Work with us</Link>
              <Link className="btn btn-ghost" href="/shop">See the treats</Link>
            </div>
          </div>
          <div className="tile t-logo" style={{ minHeight: 340 }}>
            <Image src="/logo-transparent.png" alt={SITE.name} width={660} height={660}
              style={{ maxWidth: 360, height: "auto" }} />
          </div>
        </div>
      </section>

      <section className="light">
        <div className="wrap sec">
          <div className="sec-top">
            <div><div className="eyebrow">How we work</div><h2>Three things we don&apos;t compromise on</h2></div>
          </div>
          <div className="steps">
            <div className="step">
              <h3>Made to order</h3>
              <p>Nothing sits in a freezer. Your order is produced within 72 hours of pickup or delivery.</p>
            </div>
            <div className="step">
              <h3>Matched to your palette</h3>
              <p>Send your invitation or a hex code and we match chocolate, icing and ribbon to it.</p>
            </div>
            <div className="step">
              <h3>Honest about allergens</h3>
              <p>We label everything and tell you plainly what our kitchen handles. No vague answers.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="news">
            <div className="eyebrow">Get in touch</div>
            <h2 style={{ marginTop: 12 }}>Tell us what you&apos;re planning</h2>
            <p>Text or call {SITE.phone}, email {SITE.email}, or send the form.</p>
            <div className="hero-cta" style={{ justifyContent: "center" }}>
              <Link className="btn btn-pink" href="/quote">Request a quote</Link>
              <a className="btn btn-ghost" href={SITE.phoneHref}>
                <Icon name="i-sparkle" /> {SITE.phone}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
