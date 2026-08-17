import Link from "next/link";
import FaqList from "@/components/FaqList";

export const metadata = {
  title: "FAQ",
  description: "Lead times, color matching, delivery areas, allergies, deposits and cancellations.",
};

export default function FaqPage() {
  return (
    <section className="light flat">
      <div className="wrap sec">
        <div className="sec-top" style={{ justifyContent: "center", textAlign: "center" }}>
          <div>
            <div className="eyebrow">FAQ</div>
            <h2>Good questions, answered</h2>
          </div>
        </div>
        <FaqList />
        <div style={{ textAlign: "center", marginTop: 34 }}>
          <p style={{ color: "var(--ink-2)", marginBottom: 16 }}>Still not sure? Just ask.</p>
          <Link className="btn btn-pink" href="/quote">Send us a question</Link>
        </div>
      </div>
    </section>
  );
}
