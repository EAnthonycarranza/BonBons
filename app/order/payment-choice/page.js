import Link from "next/link";
import { SITE } from "@/lib/sample-data";

export const metadata = { title: "Payment choice", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const COPY = {
  cash: {
    title: "Got it — cash at pickup.",
    body: "Nothing to send now. Just bring your confirmed total with you when you collect your order. Bonnie can see this on her side.",
  },
  online: {
    title: "Got it — you'll pay online.",
    body: "Open Bon Bon's payment options, pick Venmo, Cash App or Zelle, and put your order number in the payment note.",
    link: true,
  },
  already_paid: {
    title: "This order is already paid.",
    body: "Nothing more to do — thank you! If you think that's a mistake, reply to your confirmation email or text Bonnie.",
  },
  invalid: {
    title: "That link didn't work.",
    body: "It may have expired or been copied incompletely. Reply to your confirmation email instead and tell Bonnie how you'd like to pay.",
  },
  unavailable: {
    title: "We couldn't save that right now.",
    body: "Your order is safe; only the payment choice didn't stick. Please try the link again in a few minutes, or reply to your confirmation email.",
  },
};

export default async function PaymentChoicePage({ searchParams }) {
  const sp = await searchParams;
  const outcome = COPY[sp?.outcome] ? sp.outcome : "invalid";
  const order = typeof sp?.order === "string" ? sp.order : "";
  const c = COPY[outcome];

  return (
    <section className="sec" style={{ padding: "100px 0" }}>
      <div className="wrap" style={{ maxWidth: 640 }}>
        {order ? <div className="eyebrow">Order {order}</div> : null}
        <h1 style={{ fontSize: "clamp(28px,4.4vw,44px)", marginTop: 10 }}>{c.title}</h1>
        <p style={{ color: "var(--muted)", marginTop: 16, fontSize: 17 }}>{c.body}</p>
        <div className="hero-cta">
          {c.link ? (
            <a className="btn btn-pink" href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">
              Open payment options
            </a>
          ) : null}
          <Link className="btn btn-ghost" href="/">Back to the shop</Link>
        </div>
        <p style={{ color: "var(--muted-2)", marginTop: 26, fontSize: 14 }}>
          Questions? Text {SITE.phone} or email {SITE.email}.
        </p>
      </div>
    </section>
  );
}
