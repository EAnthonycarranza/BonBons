import Image from "next/image";
import Link from "next/link";
import { money } from "@/lib/format";
import { stockLabel, weeklyBoxStock } from "@/lib/weekly-box";

/**
 * Homepage feature for the live Box of the Week. Renders nothing when there is
 * no box, so the home page is unaffected until the owner publishes one.
 */
export default function WeeklyBoxTeaser({ box }) {
  if (!box) return null;
  const availability = weeklyBoxStock(box);
  const soldOut = availability.state === "sold_out";
  const preview = box.items.slice(0, 4);

  return (
    <section className="wrap wbt rv-anim">
      <div className="wbt-photo">
        {box.image ? (
          <Image
            src={box.image}
            alt={`${box.title} — this week's Celebration Box`}
            fill
            sizes="(max-width: 860px) 100vw, 42vw"
          />
        ) : (
          <span className="wbt-photo-empty" aria-hidden="true" />
        )}
        <span className="wbt-price">{money(box.price)}</span>
      </div>

      <div className="wbt-copy">
        <span className="wbt-eyebrow">Box of the week</span>
        <h2>{box.title}</h2>
        {box.tagline ? <p className="wbt-tagline">{box.tagline}</p> : null}

        {preview.length ? (
          <ul className="wbt-flavors">
            {preview.map((item, index) => <li key={`${item.name}-${index}`}>{item.name}</li>)}
            {box.items.length > preview.length ? (
              <li className="is-more">+{box.items.length - preview.length} more</li>
            ) : null}
          </ul>
        ) : null}

        <div className={`wbt-stock is-${availability.state}`}>
          <span className="wbt-dot" aria-hidden="true" />
          <b>{soldOut ? "Sold out this week" : stockLabel(availability)}</b>
          {!soldOut && availability.state === "low" ? <span>Going fast</span> : null}
        </div>

        <div className="wbt-actions">
          <Link className="btn btn-pink" href="/box-of-the-week">
            {soldOut ? "See this week's box" : "View the box"}
          </Link>
          <Link className="text-link" href="/shop">
            Or browse every flavor <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
