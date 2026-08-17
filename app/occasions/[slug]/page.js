import Link from "next/link";
import { notFound } from "next/navigation";
import { OCCASIONS } from "@/lib/sample-data";
import { Icon } from "@/components/Icons";

export function generateStaticParams() {
  return OCCASIONS.map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const occ = OCCASIONS.find((o) => o.slug === slug);
  if (!occ) return { title: "Not found" };
  return { title: occ.title, description: occ.short };
}

export default async function OccasionPage({ params }) {
  const { slug } = await params;
  const occ = OCCASIONS.find((o) => o.slug === slug);
  if (!occ) notFound();

  const others = OCCASIONS.filter((o) => o.slug !== slug);

  return (
    <>
      <section className="sec" style={{ paddingBottom: 30 }}>
        <div className="wrap">
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 22 }}>
            <Link href="/occasions">Occasions</Link> <span aria-hidden="true">/</span> {occ.title}
          </p>

          <div className="tile" style={{ background: occ.gradient, padding: 46, color: "#fff" }}>
            <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", maxWidth: "18ch" }}>{occ.title}</h1>
            <p style={{ marginTop: 14, fontSize: 18, maxWidth: "56ch", opacity: .95 }}>{occ.intro}</p>
          </div>

          <div className="split" style={{ marginTop: 46 }}>
            <div>
              <h2 style={{ fontSize: 30 }}>What&apos;s included</h2>
              <ul className="checks" style={{ marginTop: 18 }}>
                {occ.bullets.map((b) => (
                  <li key={b}><Icon name="i-check" /> {b}</li>
                ))}
              </ul>
              <div className="hero-cta">
                <Link className="btn btn-pink" href="/quote">Get a quote</Link>
                <Link className="btn btn-ghost" href="/shop">Browse treats</Link>
              </div>
            </div>
            <div className="tile" style={{ padding: 30 }}>
              <h3 style={{ fontSize: 20, marginBottom: 12 }}>Other occasions</h3>
              <ul style={{ listStyle: "none", display: "grid", gap: 12 }}>
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link href={`/occasions/${o.slug}`} style={{ color: "var(--pink-2)", fontWeight: 600 }}>
                      {o.title} →
                    </Link>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>{o.short}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
