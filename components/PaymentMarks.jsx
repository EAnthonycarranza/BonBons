// Payment marks for the three services Bonnie accepts.
//
// The logo paths are Simple Icons (https://simpleicons.org), released under
// CC0-1.0, so they ship inline: no icon dependency, no CDN request, no flash of
// unstyled icons. Font Awesome was the other candidate but its Venmo glyph is
// the same wordmark, so it solved nothing and cost a dependency.
//
// `box` is each path's measured bounding box within the 24x24 canvas. Simple
// Icons does not trim its paths, so the glyphs have to be measured to be
// centred: Zelle's is 14.06 wide, not 24.
//
// Venmo's only official mark is a 5.3:1 wordmark, which turns to mush inside a
// 24px square. It gets a wide tile instead, and no text label — the wordmark
// already spells the name. The other two are square glyphs and keep theirs.
const MARKS = {
  venmo: {
    label: "Venmo",
    hex: "#008CFF",
    box: [0, 9.73, 24, 4.55],
    wordmark: true,
    d: "M21.772 13.119c-.267 0-.381-.251-.38-.655 0-.533.121-1.575.712-1.575.267 0 .357.243.357.598 0 .533-.13 1.632-.689 1.632Zm.502-3.377c-1.677 0-2.405 1.285-2.405 2.658 0 1.042.421 1.874 1.693 1.874 1.717 0 2.438-1.406 2.438-2.763 0-1.025-.462-1.769-1.726-1.769Zm-3.833 0c-.558 0-.964.17-1.393.477-.154-.275-.462-.477-.932-.477-.542 0-.947.219-1.247.437l-.04-.364H13.54l-.688 4.354h1.506l.479-3.053c.129-.065.323-.154.518-.154.145 0 .267.049.267.267 0 .056-.016.145-.024.218l-.429 2.722h1.498l.478-3.053c.138-.073.324-.154.51-.154.146 0 .268.049.268.267 0 .056-.017.145-.025.218l-.429 2.722h1.499l.461-2.908c.025-.153.049-.388.049-.549 0-.582-.267-.97-1.037-.97Zm-6.871 0c-.575 0-.98.219-1.287.421l-.017-.348H8.962l-.689 4.354H9.78l.478-3.053c.13-.065.324-.154.518-.154.147 0 .268.049.268.242 0 .081-.024.227-.032.299l-.422 2.666h1.499l.462-2.908c.024-.153.049-.388.049-.549 0-.582-.268-.97-1.03-.97Zm-5.631 1.834c.041-.485.413-.824.697-.824.162 0 .299.097.299.291 0 .404-.713.533-.996.533Zm.843-1.834c-1.604 0-2.382 1.39-2.382 2.698 0 1.01.478 1.817 1.814 1.817.527 0 1.07-.113 1.418-.282l.186-1.26c-.494.25-.874.347-1.271.347-.365 0-.64-.194-.64-.687.826-.008 2.252-.347 2.252-1.453 0-.687-.494-1.18-1.377-1.18Zm-4.239.267c.089.186.146.412.146.743 0 .606-.429 1.494-.777 2.06l-.373-2.989L0 9.969l.705 4.2h1.757c.77-1.01 1.718-2.448 1.718-3.554 0-.347-.073-.622-.235-.889l-1.402.283Z",
  },
  cashapp: {
    label: "Cash App",
    hex: "#00C244",
    box: [0, 0, 24, 23.99],
    d: "M23.59 3.475a5.1 5.1 0 00-3.05-3.05c-1.31-.42-2.5-.42-4.92-.42H8.36c-2.4 0-3.61 0-4.9.4a5.1 5.1 0 00-3.05 3.06C0 4.765 0 5.965 0 8.365v7.27c0 2.41 0 3.6.4 4.9a5.1 5.1 0 003.05 3.05c1.3.41 2.5.41 4.9.41h7.28c2.41 0 3.61 0 4.9-.4a5.1 5.1 0 003.06-3.06c.41-1.3.41-2.5.41-4.9v-7.25c0-2.41 0-3.61-.41-4.91zm-6.17 4.63l-.93.93a.5.5 0 01-.67.01 5 5 0 00-3.22-1.18c-.97 0-1.94.32-1.94 1.21 0 .9 1.04 1.2 2.24 1.65 2.1.7 3.84 1.58 3.84 3.64 0 2.24-1.74 3.78-4.58 3.95l-.26 1.2a.49.49 0 01-.48.39H9.63l-.09-.01a.5.5 0 01-.38-.59l.28-1.27a6.54 6.54 0 01-2.88-1.57v-.01a.48.48 0 010-.68l1-.97a.49.49 0 01.67 0c.91.86 2.13 1.34 3.39 1.32 1.3 0 2.17-.55 2.17-1.42 0-.87-.88-1.1-2.54-1.72-1.76-.63-3.43-1.52-3.43-3.6 0-2.42 2.01-3.6 4.39-3.71l.25-1.23a.48.48 0 01.48-.38h1.78l.1.01c.26.06.43.31.37.57l-.27 1.37c.9.3 1.75.77 2.48 1.39l.02.02c.19.2.19.5 0 .68z",
  },
  zelle: {
    label: "Zelle",
    hex: "#6D1ED4",
    box: [4.97, 0, 14.06, 24],
    d: "M13.559 24h-2.841a.483.483 0 0 1-.483-.483v-2.765H5.638a.667.667 0 0 1-.666-.666v-2.234a.67.67 0 0 1 .142-.412l8.139-10.382h-7.25a.667.667 0 0 1-.667-.667V3.914c0-.367.299-.666.666-.666h4.23V.483c0-.266.217-.483.483-.483h2.841c.266 0 .483.217.483.483v2.765h4.323c.367 0 .666.299.666.666v2.137a.67.67 0 0 1-.141.41l-8.19 10.481h7.665c.367 0 .666.299.666.666v2.477a.667.667 0 0 1-.666.667h-4.32v2.765a.483.483 0 0 1-.483.483Z",
  },
};

export const PAYMENT_METHODS = ["venmo", "cashapp", "zelle"];

// Square glyphs sit at 70% of the tile; the wordmark is set by height so its
// tile grows sideways to whatever the 5.3:1 aspect needs.
const SQUARE_INSET = 0.7;
const WORDMARK_HEIGHT = 0.44;
const WORDMARK_PADDING = 8;

export function PaymentMark({ name, size = 24 }) {
  const mark = MARKS[name];
  if (!mark) return null;

  const [x, y, w, h] = mark.box;
  const scale = mark.wordmark
    ? (size * WORDMARK_HEIGHT) / h
    : (size * SQUARE_INSET) / Math.max(w, h);
  const width = mark.wordmark
    ? Math.round(w * scale + WORDMARK_PADDING * 2)
    : size;
  const tx = (width - w * scale) / 2 - x * scale;
  const ty = (size - h * scale) / 2 - y * scale;

  return (
    <svg
      className="pay-mark"
      width={width}
      height={size}
      viewBox={`0 0 ${width} ${size}`}
      role="img"
      aria-label={mark.label}
      focusable="false"
    >
      <rect width={width} height={size} rx={size * 0.25} fill={mark.hex} />
      <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`}>
        <path d={mark.d} fill="#fff" />
      </g>
    </svg>
  );
}

// The names sit beside the square marks so the row still reads for anyone who
// does not recognise a logo, and if an SVG fails to paint.
export function PaymentMethods({ size = 24, className = "" }) {
  return (
    <ul className={`pay-methods ${className}`.trim()}>
      {PAYMENT_METHODS.map((name) => (
        <li
          key={name}
          className={
            MARKS[name].wordmark ? "pay-method pay-method-wordmark" : "pay-method"
          }
        >
          <PaymentMark name={name} size={size} />
          {MARKS[name].wordmark ? null : <span>{MARKS[name].label}</span>}
        </li>
      ))}
    </ul>
  );
}
