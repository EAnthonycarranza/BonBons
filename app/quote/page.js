import QuoteForm, { QuoteAside } from "@/components/QuoteForm";

export const metadata = {
  title: "Get a quote",
  description: "Tell us about your celebration and we'll send a quote, usually the same business day.",
};

export default function QuotePage() {
  return (
    <section className="light flat">
      <div className="wrap sec">
        <div className="sec-top">
          <div>
            <div className="eyebrow">Get a quote</div>
            <h2>Tell us about your celebration</h2>
            <p>About a minute to fill in. Most quotes come back the same business day.</p>
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
