"use client";

import { useId, useState } from "react";
import { FAQS } from "@/lib/sample-data";

export default function FaqList({ items = FAQS, defaultOpenFirst = true }) {
  const groupId = useId();
  const [openItems, setOpenItems] = useState(() => new Set(defaultOpenFirst ? [0] : []));

  const toggleItem = (index) => {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="faq">
      {items.map((f, i) => {
        const isOpen = openItems.has(i);
        const buttonId = `${groupId}-question-${i}`;
        const answerId = `${groupId}-answer-${i}`;

        return (
          <div className={`faq-item rv-anim${isOpen ? " is-open" : ""}`} key={f.q}>
            <button
              className="faq-question"
              id={buttonId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={answerId}
              onClick={() => toggleItem(i)}
            >
              {f.q}
            </button>
            <div
              className="faq-answer-shell"
              id={answerId}
              role="region"
              aria-labelledby={buttonId}
              aria-hidden={!isOpen}
              inert={!isOpen}
            >
              <div className="faq-answer-inner">
                <div className="a">{f.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
