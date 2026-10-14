/** Custom navigation arrows share one optical weight across links and controls. */
export default function ArrowIcon({ direction = "right", className = "" }) {
  return (
    <svg
      className={`arrow-icon arrow-icon--${direction} ${className}`.trim()}
      width="28"
      height="20"
      viewBox="0 0 28 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {direction === "up-right" ? (
        <path d="M7 16 21 4M11 4h10v10" />
      ) : (
        <path
          d="M4 10h20m-6-6 6 6-6 6"
          transform={direction === "left" ? "translate(28 0) scale(-1 1)" : undefined}
        />
      )}
    </svg>
  );
}
