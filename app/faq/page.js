import Image from "next/image";
import FaqList from "@/components/FaqList";
import { SITE } from "@/lib/sample-data";

export const metadata = {
  title: "FAQ",
  description:
    "Everything to know about cake pop pricing, pickup, allergies, payment arrangements, and changes.",
};

export default function FaqPage() {
  return (
    <section className="sec">
      <div className="wrap faq-layout">
        <div className="faq-intro rv-anim">
          <div className="eyebrow">A few helpful details</div>
          <h1>
            Good questions.
            <br />
            <em>Sweet answers.</em>
          </h1>
          <p>
            From your first cake pop to pickup day, here is what you need to
            know.
          </p>
          <a className="text-link" href={`mailto:${SITE.email}`}>
            Still have a question? Email Bonnie <span aria-hidden="true">↗</span>
          </a>
          <Image
            className="faq-photo"
            src="/products/bonbons-assortment-styled.webp"
            alt="Styled image of Bon Bon’s individually wrapped sprinkle, cookie-crumb, and chocolate cake pops"
            width={400}
            height={280}
          />
        </div>
        <div><FaqList /><p style={{ marginTop: 24 }}>Already have a confirmed order? <a className="text-link" href={SITE.paymentUrl} target="_blank" rel="noopener noreferrer">Open payment options ↗</a></p></div>
      </div>
    </section>
  );
}
