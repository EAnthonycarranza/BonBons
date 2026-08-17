import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <section className="sec" style={{ textAlign: "center", padding: "120px 0" }}>
      <div className="wrap">
        <div className="eyebrow">404</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", marginTop: 12 }}>
          That page melted.
        </h1>
        <p style={{ color: "var(--muted)", marginTop: 16, maxWidth: "44ch", marginInline: "auto" }}>
          We couldn&apos;t find what you were looking for — but the treats are all still here.
        </p>
        <div className="hero-cta" style={{ justifyContent: "center" }}>
          <Link className="btn btn-pink" href="/shop">Shop treats</Link>
          <Link className="btn btn-ghost" href="/">Back home</Link>
        </div>
      </div>
    </section>
  );
}
