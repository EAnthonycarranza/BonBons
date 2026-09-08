import Image from "next/image";
import Link from "next/link";
import { getFeaturedWeeklyBox } from "@/lib/weekly-box-data";
import { weeklyBoxCartKey, weeklyBoxStock } from "@/lib/weekly-box";
import { boxPopCount } from "@/supabase/functions/_shared/menu";
import { money } from "@/lib/format";
import WeeklyBoxStock from "@/components/WeeklyBoxStock";
import WeeklyBoxAddToCart from "@/components/WeeklyBoxAddToCart";
import "../celebration-box.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Box of the Week · Bon Bon's Sweets & More",
  description:
    "This week's Celebration Box from Bon Bon's Sweets & More — a limited run of handmade cake pops, available for San Antonio pickup while supplies last.",
};

export default async function BoxOfTheWeekPage() {
  const box = await getFeaturedWeeklyBox();

  if (!box) {
    return (
      <main className="wb-page">
        <div className="wb-confetti" aria-hidden="true" />
        <section className="wrap wb-empty">
          <span className="wb-eyebrow">Celebration Box</span>
          <h1>No box this week — yet.</h1>
          <p>
            A new Celebration Box is posted each week. In the meantime, every flavor on
            the menu is available on its own or as a four-pack.
          </p>
          <Link className="btn btn-pink" href="/shop">Browse the menu</Link>
        </section>
      </main>
    );
  }

  const availability = weeklyBoxStock(box);
  const soldOut = availability.state === "sold_out";
  const popCount = boxPopCount(box.items);

  return (
    <main className="wb-page">
      <div className="wb-confetti" aria-hidden="true" />

      <section className="wrap wb-hero">
        <div className="wb-hero-copy">
          <span className="wb-eyebrow">Look who&rsquo;s joining the box</span>
          <h1>
            This week&rsquo;s <em>Celebration Box.</em>
          </h1>
          {box.tagline ? <p className="wb-tagline">{box.tagline}</p> : null}

          <div className="wb-price-row">
            <div className="wb-price-tag">
              <small>Celebration Boxes</small>
              <b>{money(box.price)}</b>
            </div>
            <WeeklyBoxStock availability={availability} total={box.initialStock} />
          </div>

          {soldOut ? (
            <div className="wb-soldout-panel">
              <b>Sold out for this week</b>
              <p>Check back next week, or build a four-pack from the current menu.</p>
              <Link className="btn btn-ghost" href="/build-a-box">Build a four-pack</Link>
            </div>
          ) : (
            <WeeklyBoxAddToCart box={box} cartKey={weeklyBoxCartKey(box)} remaining={availability.tracked ? availability.remaining : 50} />
          )}
        </div>

        <div className="wb-hero-photo">
          {box.image ? (
            <Image
              src={box.image}
              alt={`${box.title} — this week's Celebration Box from Bon Bon's`}
              width={900}
              height={900}
              priority
              sizes="(max-width: 900px) 92vw, 44vw"
            />
          ) : (
            <div className="wb-photo-empty">
              <Image src="/logo-transparent.png" alt="" width={150} height={150} />
              <span>Photo coming soon</span>
            </div>
          )}
          <span className="wb-thankyou" aria-hidden="true">Thank<br />you!</span>
        </div>
      </section>

      <section className="wb-includes-band">
        <div className="wrap">
          <h2>This week&rsquo;s Celebration Box includes</h2>
        </div>
      </section>

      <section className="wrap wb-items">
        {box.items.length ? (
          <ol className="wb-item-grid">
            {box.items.map((item, index) => (
              <li key={`${item.name}-${index}`} className={index % 2 ? "is-pink" : "is-blue"}>
                <span className="wb-item-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <b>{item.name}</b>
                {Number(item.qty) > 1 ? <span className="wb-item-qty">&times;{item.qty}</span> : null}
                {item.note ? <span className="wb-item-note">{item.note}</span> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="wb-items-empty">The flavor list for this box is being finalised.</p>
        )}

        {box.description ? (
          <div className="wb-description">
            {box.description.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        <p className="wb-footnote">
          {popCount ? `${popCount} ${popCount === 1 ? "cake pop" : "cake pops"} in every box. ` : ""}
          Big variety. Big flavor. Big smiles! These boxes are made in a limited run and are
          available <b>while supplies last</b>. San Antonio pickup only; a member of the shop
          confirms your pickup time after you send a request.
        </p>
      </section>
    </main>
  );
}
