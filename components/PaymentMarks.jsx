// The three services Bonnie accepts. Each mark is a letterform in the brand's
// colour rather than a traced logo — the real wordmarks are trademarked and
// illegible at this size, while a coloured tile is recognisable at 24px and
// still reads against the dark footer.
const MARKS = {
  venmo: {
    label: "Venmo",
    bg: "#008CFF",
    glyph: (
      <path
        d="M8 7.6 12 16.4 16 7.6"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  cashapp: {
    label: "Cash App",
    bg: "#00C244",
    glyph: (
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 5.4v13.2" />
        <path d="M15.3 9.2c-.5-1.1-1.8-1.7-3.3-1.7-1.7 0-3 .9-3 2.2 0 3 6.3 1.7 6.3 4.7 0 1.4-1.4 2.3-3.2 2.3-1.6 0-2.9-.7-3.4-1.8" />
      </g>
    ),
  },
  zelle: {
    label: "Zelle",
    bg: "#6D1ED4",
    glyph: (
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 4.2v15.6" />
        <path d="M9 9.1h6l-6 5.8h6" />
      </g>
    ),
  },
};

export const PAYMENT_METHODS = ["venmo", "cashapp", "zelle"];

export function PaymentMark({ name, size = 24 }) {
  const mark = MARKS[name];
  if (!mark) return null;
  return (
    <svg
      className="pay-mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={mark.label}
      focusable="false"
    >
      <rect width="24" height="24" rx="6" fill={mark.bg} />
      {mark.glyph}
    </svg>
  );
}

// The labels sit next to the marks so the row still makes sense to anyone who
// does not recognise a logo, and so it survives a failed SVG render.
export function PaymentMethods({ size = 24, className = "" }) {
  return (
    <ul className={`pay-methods ${className}`.trim()}>
      {PAYMENT_METHODS.map((name) => (
        <li key={name} className="pay-method">
          <PaymentMark name={name} size={size} />
          <span>{MARKS[name].label}</span>
        </li>
      ))}
    </ul>
  );
}
