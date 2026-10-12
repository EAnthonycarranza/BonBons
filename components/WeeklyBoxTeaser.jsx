import Link from "next/link";
import { money } from "@/lib/format";
import { stockLabel, weeklyBoxStock } from "@/lib/weekly-box";
import { weeklyBoxPresentation } from "@/lib/weekly-box-presentation";
import WeeklyBoxArtwork from "./WeeklyBoxArtwork";
import { Icon } from "./Icons";
import "@/app/celebration-box.css";
import { PAGE_DEFAULTS, pageText } from "@/lib/page-content";

export default function WeeklyBoxTeaser({ box, products = [], content = PAGE_DEFAULTS.home.sections.find(section=>section.id === "weekly").fields }) {
  if (!box) return null;
  const availability = weeklyBoxStock(box);
  const soldOut = availability.state === "sold_out";
  const presentation = weeklyBoxPresentation(box, products);
  return (
    <section className="weekly-home-feature" aria-labelledby="weekly-home-title">
      <div className="wrap">
        <div className="weekly-home-label rv-anim"><span className="weekly-kicker">{content.eyebrow}</span><span>{content.note}</span></div>
        <div className={`weekly-home-grid rv-anim${presentation.boxImage ? " has-poster" : ""}`}>
          <div className="weekly-home-art"><WeeklyBoxArtwork box={box} presentation={presentation} /></div>
          <div className="weekly-home-copy">
            <span className="weekly-home-overline">{content.overline}</span>
            <h2 id="weekly-home-title">{content.heading}<br /><em>{content.highlight}</em></h2>
            <p>{pageText(content.body,{boxTitle:box.title,popCount:presentation.popCount,flavorCount:presentation.flavorCount})}</p>
            <div className="weekly-home-offer"><b>{money(box.price)}</b><span>per box<span className={`weekly-home-stock is-${availability.state}`}>{soldOut ? "Sold out this week" : stockLabel(availability) || "Available this week"}</span></span></div>
            <Link className="btn btn-pink" href="/box-of-the-week">{soldOut ? content.soldOutLabel : content.actionLabel}<Icon name="i-arrow" width={19} height={19} /></Link>
            <small>{content.pickupNote}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
