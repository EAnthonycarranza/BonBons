import QuoteForm, { QuoteAside } from "@/components/QuoteForm";

export const metadata = {
  title: "Custom and event cake pop requests",
  description:
    "Ask about custom colors, larger quantities, or cake pops for an event.",
};

export default function QuotePage() {
  return (
    <section className="light flat sec">
      <div className="wrap">
        <div className="sec-top rv-anim">
          <div>
            <div className="eyebrow">Custom &amp; event orders</div>
            <h1>
              For the moments
              <br />
              worth <em>making your own.</em>
            </h1>
            <p>
              Cake pops are available one at a time or four for $10 in the shop.
              Use this form when you want custom colors, a larger quantity, or
              an event theme.
            </p>
          </div>
        </div>
        <div className="form-wrap">
          <QuoteForm />
          <QuoteAside />
        </div>
      </div>
    </section>
  );
}
