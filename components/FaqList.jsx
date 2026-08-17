import { FAQS } from "@/lib/sample-data";

export default function FaqList({ items = FAQS, defaultOpenFirst = true }) {
  return (
    <div className="faq">
      {items.map((f, i) => (
        <details key={f.q} open={defaultOpenFirst && i === 0}>
          <summary>{f.q}</summary>
          <div className="a">{f.a}</div>
        </details>
      ))}
    </div>
  );
}
