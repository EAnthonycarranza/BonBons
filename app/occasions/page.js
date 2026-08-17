import Link from "next/link";
import { OCCASIONS } from "@/lib/sample-data";

export const metadata = {
  title: "Occasions",
  description: "Weddings, showers, birthdays, quinces and corporate events — built for the day that matters.",
};

export default function OccasionsPage() {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Occasions</div>
            <h2>Built for the day that matters</h2>
            <p>Every celebration has a different shape. Here&apos;s how we approach the common ones.</p>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
          {OCCASIONS.map((o) => (
            <Link key={o.slug} href={`/occasions/${o.slug}`} className="oc"
              style={{ background: o.gradient, minHeight: 220 }}>
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
  );
}
