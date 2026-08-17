import Link from "next/link";
import { Icon } from "@/components/Icons";

export const metadata = {
  title: "Dessert tables",
  description: "Full dessert table styling, delivery and on-site setup for weddings, showers, quinces and corporate events.",
};

const STEPS = [
  { h: "Tell us the date and vibe", p: "Share your venue, headcount, colors and any inspiration photos. We'll tell you within a day whether the date is open." },
  { h: "We design and quote", p: "You get a layout sketch, a treat list and a price. Nothing is made until you approve it." },
  { h: "Deposit locks the date", p: "A 50% deposit holds your slot. Final numbers are confirmed one week out." },
  { h: "We set up and clear away", p: "We arrive early, build the display, and return for stands and linens the same night." },
];

export default function DessertTablesPage() {
  return (
    <>
      <section className="sec">
        <div className="wrap">
          <div className="split">
            <div>
              <div className="eyebrow">Dessert tables</div>
              <h1 style={{ fontSize: "clamp(32px,4.6vw,54px)", marginTop: 12 }}>
                We deliver it, style it, and clear it away.
              </h1>
              <p style={{ color: "var(--muted)", marginTop: 16, fontSize: 17.5 }}>
                A dessert table is where your guests gather and where most of the photos
                get taken. We build it around your palette so it belongs to the room
                rather than sitting in the corner of it.
              </p>
              <ul className="checks" style={{ marginTop: 22 }}>
                <li><Icon name="i-check" /> Serves 20 to 300 guests</li>
                <li><Icon name="i-check" /> Stands, risers, linens and signage included</li>
                <li><Icon name="i-check" /> Color matched from your invitation or swatches</li>
                <li><Icon name="i-check" /> Setup and same-night teardown</li>
              </ul>
              <div className="hero-cta">
                <Link className="btn btn-pink" href="/quote">Request a quote</Link>
                <Link className="btn btn-ghost" href="/shop">Browse treats</Link>
              </div>
            </div>
            <div className="gal" aria-label="Dessert table examples">
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

      <section className="light">
        <div className="wrap sec">
          <div className="sec-top">
            <div><div className="eyebrow">How it works</div><h2>From first message to last plate</h2></div>
          </div>
          <div className="steps" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
            {STEPS.map((s) => (
              <div className="step" key={s.h}>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34 }}>
            <Link className="btn btn-pink" href="/quote">Start my dessert table</Link>
          </div>
        </div>
      </section>
    </>
  );
}
