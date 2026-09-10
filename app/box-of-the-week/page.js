import Image from "next/image";
import Link from "next/link";
import { getFeaturedWeeklyBox } from "@/lib/weekly-box-data";
import { getProducts } from "@/lib/products";
import { weeklyBoxCartKey, weeklyBoxStock } from "@/lib/weekly-box";
import { weeklyBoxPresentation } from "@/lib/weekly-box-presentation";
import { money } from "@/lib/format";
import { SITE } from "@/lib/sample-data";
import { Icon } from "@/components/Icons";
import WeeklyBoxStock from "@/components/WeeklyBoxStock";
import WeeklyBoxAddToCart from "@/components/WeeklyBoxAddToCart";
import WeeklyBoxArtwork from "@/components/WeeklyBoxArtwork";
import "../celebration-box.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Box of the Week",
  description: "Meet this week’s Celebration Box: a handpicked mix of Bon Bon’s cake pops. Explore the flavors and request your box for San Antonio pickup.",
};

export default async function BoxOfTheWeekPage() {
  const [box, products] = await Promise.all([getFeaturedWeeklyBox(), getProducts()]);
  if (!box) return (
    <div className="weekly-page">
      <section className="wrap weekly-empty rv-anim">
        <Image src="/logo-transparent.png" alt="Bon Bon’s Sweets & More" width={130} height={130} />
        <span className="weekly-kicker">The weekly edit</span>
        <h1>A little anticipation.<br /><em>A lot to look forward to.</em></h1>
        <p>There isn’t a featured box right now. Explore the current cake-pop menu, or follow Bonnie for the next announcement.</p>
        <div className="weekly-actions"><Link className="btn btn-pink" href="/shop">Explore the menu</Link><a className="text-link" href={SITE.instagram} target="_blank" rel="noopener noreferrer">Follow along on Instagram</a></div>
      </section>
    </div>
  );

  const availability = weeklyBoxStock(box);
  const soldOut = availability.state === "sold_out";
  const presentation = weeklyBoxPresentation(box, products);
  const { popCount, flavorCount, items } = presentation;

  return (
    <div className="weekly-page">
      <div className="wrap weekly-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><span>Box of the Week</span></div>
      <section className={`wrap weekly-hero${presentation.boxImage ? " has-poster" : ""}`} aria-labelledby="weekly-title">
        <div className="weekly-hero-copy rv-anim">
          <span className="weekly-kicker">A little celebration, just for you</span>
          <h1 id="weekly-title">Look who’s<br /><em>in the box.</em></h1>
          <p className="weekly-intro">Meet this week’s <strong>{box.title}</strong>. {box.tagline || "A handpicked mix of cake pops for sharing, gifting, or making an ordinary day a little sweeter."}</p>
          <div className="weekly-specs">
            <div><b>{popCount}</b><span>handmade cake {popCount === 1 ? "pop" : "pops"}</span></div>
            <div><b>{flavorCount}</b><span>{flavorCount === 1 ? "flavor" : "flavors"} to enjoy</span></div>
            <div><b>Local</b><span>San Antonio pickup</span></div>
          </div>
          <div className="weekly-hero-actions"><a className="btn btn-pink" href="#request-weekly-box">{soldOut ? "View availability" : `Get this week’s box · ${money(box.price)}`}<Icon name="i-arrow" width={18} height={18} /></a><a className="weekly-lineup-link" href="#inside-the-box">Meet the flavors</a></div>
        </div>
        <div className="weekly-hero-visual rv-anim">
          <div className="weekly-visual-heading"><span>The {box.title}</span><span>This week’s selection</span></div>
          <WeeklyBoxArtwork box={box} presentation={presentation} priority />
        </div>
      </section>

      <section className="wrap weekly-request-wrap rv-anim" id="request-weekly-box" aria-label="Request this week’s box">
        <div className="weekly-request-card">
          <div className="weekly-offer"><span className="weekly-kicker">Your box of happy</span><div><b>{money(box.price)}</b><span>per box<br />{popCount} cake {popCount === 1 ? "pop" : "pops"} included</span></div></div>
          <WeeklyBoxStock availability={availability} total={box.initialStock} />
          <div className="weekly-request-actions">
            {soldOut ? <div className="weekly-sold-out"><h2>This week’s box is sold out.</h2><p>There’s still something sweet on the menu.</p><Link className="btn btn-pink" href="/shop">Explore available cake pops</Link></div> : <WeeklyBoxAddToCart box={{ ...box, image: presentation.cartImage }} cartKey={weeklyBoxCartKey(box)} remaining={availability.tracked ? availability.remaining : 50} />}
            <p className="weekly-request-note">Pickup only. Sending a request doesn’t reserve stock or take payment; Bonnie confirms your order first.</p>
          </div>
        </div>
      </section>

      <section className="sec weekly-lineup" id="inside-the-box" aria-labelledby="weekly-lineup-title">
        <div className="wrap">
          <div className="weekly-section-heading rv-anim"><div><span className="weekly-kicker">The sweetest kind of company</span><h2 id="weekly-lineup-title">This week’s <em>lineup.</em></h2></div><p>{popCount} cake {popCount === 1 ? "pop" : "pops"}. {flavorCount} {flavorCount === 1 ? "flavor" : "flavors"}. One very happy box.<br />Here’s exactly what’s coming home with you.</p></div>
          <ol className="weekly-flavor-grid">
            {items.map((item, index) => (
              <li className="weekly-flavor-card rv-anim" data-motion="card" key={`${item.slug || item.name}-${index}`}>
                <div className="weekly-flavor-photo">
                  {item.image ? <Image src={item.image} alt={`${item.name} cake pop`} fill sizes="(max-width:600px) 92vw, (max-width:1000px) 45vw, 30vw" /> : <div className="weekly-flavor-placeholder"><Image src="/logo-transparent.png" alt="" width={120} height={120} /><span>Photo coming soon</span></div>}
                  <span className="weekly-flavor-count">{item.qty} in your box</span>
                </div>
                <div className="weekly-flavor-info"><span className="weekly-flavor-number">{String(index + 1).padStart(2, "0")}</span><div><h3>{item.name}</h3>{item.note ? <p>{item.note}</p> : <p>Handmade by Bon Bon’s</p>}</div></div>
              </li>
            ))}
          </ol>
          <div className="weekly-lineup-footnote"><p>Flavors and quantities shown are this week’s fixed selection. Prefer to pick your own? <Link href="/build-a-box">Build a four-pack.</Link></p></div>
        </div>
      </section>

      <section className="weekly-pickup-section">
        <div className="wrap weekly-pickup-grid">
          <div className="rv-anim"><span className="weekly-kicker">From our kitchen to your week</span><h2>A few little steps.<br /><em>A whole lot of joy.</em></h2>{box.description && <p className="weekly-description">{box.description}</p>}<a className="text-link" href={SITE.phoneHref}>Questions? Call Bonnie <Icon name="i-arrow" width={18} height={18} /></a></div>
          <ol className="weekly-steps">
            <li className="rv-anim"><span>01</span><div><h3>Choose your boxes</h3><p>Add this week’s selection to your pickup request. Each box includes the lineup above.</p></div></li>
            <li className="rv-anim"><span>02</span><div><h3>We’ll confirm the details</h3><p>Bonnie confirms availability, your total, payment instructions, and pickup time and location.</p></div></li>
            <li className="rv-anim"><span>03</span><div><h3>Pick up. Open. Enjoy.</h3><p>Handmade cake pops, ready for a sweet moment. San Antonio pickup only; no delivery.</p></div></li>
          </ol>
        </div>
      </section>
      <section className="wrap weekly-closing rv-anim"><span className="weekly-kicker">Big variety. Big flavor. Big smiles.</span><h2>A sweeter week <em>starts here.</em></h2><a className="btn btn-pink" href="#request-weekly-box">{soldOut ? "View this week’s availability" : `Request the ${box.title}`}<Icon name="i-arrow" width={18} height={18} /></a><p>Please contact Bonnie about ingredients and allergies before ordering.</p></section>
      <div className="mbar weekly-mobile-bar"><a className="btn btn-ghost" href="#inside-the-box">Meet the flavors</a><a className="btn btn-pink" href="#request-weekly-box">{soldOut ? "Box sold out" : `Request a box · ${money(box.price)}`}</a></div>
    </div>
  );
}
