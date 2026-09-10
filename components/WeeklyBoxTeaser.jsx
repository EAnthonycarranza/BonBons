import Link from "next/link";
import { money } from "@/lib/format";
import { stockLabel, weeklyBoxStock } from "@/lib/weekly-box";
import { weeklyBoxPresentation } from "@/lib/weekly-box-presentation";
import WeeklyBoxArtwork from "./WeeklyBoxArtwork";
import { Icon } from "./Icons";
import "@/app/celebration-box.css";

export default function WeeklyBoxTeaser({ box, products = [] }) {
  if (!box) return null;
  const availability = weeklyBoxStock(box);
  const soldOut = availability.state === "sold_out";
  const presentation = weeklyBoxPresentation(box, products);
  return (
    <section className="weekly-home-feature" aria-labelledby="weekly-home-title">
      <div className="wrap">
        <div className="weekly-home-label rv-anim"><span className="weekly-kicker">The weekly edit</span><span>Handpicked by Bon Bon’s</span></div>
        <div className={`weekly-home-grid rv-anim${presentation.boxImage ? " has-poster" : ""}`}>
          <div className="weekly-home-art"><WeeklyBoxArtwork box={box} presentation={presentation} /></div>
          <div className="weekly-home-copy">
            <span className="weekly-home-overline">Look who’s joining the box</span>
            <h2 id="weekly-home-title">Your week.<br /><em>A little sweeter.</em></h2>
            <p>Meet the {box.title}: {presentation.popCount} handmade cake pops, {presentation.flavorCount} {presentation.flavorCount === 1 ? "flavor" : "flavors"}, and a little something to look forward to.</p>
            <div className="weekly-home-offer"><b>{money(box.price)}</b><span>per box<span className={`weekly-home-stock is-${availability.state}`}>{soldOut ? "Sold out this week" : stockLabel(availability) || "Available this week"}</span></span></div>
            <Link className="btn btn-pink" href="/box-of-the-week">{soldOut ? "See this week’s box" : "Discover the Box of the Week"}<Icon name="i-arrow" width={19} height={19} /></Link>
            <small>Limited batch · San Antonio pickup only</small>
          </div>
        </div>
      </div>
    </section>
  );
}
