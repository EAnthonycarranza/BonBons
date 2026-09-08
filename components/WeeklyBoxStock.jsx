import { stockLabel } from "@/lib/weekly-box";

/**
 * The scarcity read-out. `state` comes from stockState() so the wording and the
 * meter can never disagree with what the order pipeline will actually accept.
 */
export default function WeeklyBoxStock({ availability, total }) {
  const { state, remaining } = availability;
  const start = Math.max(Number(total) || 0, remaining);
  const pct = start > 0 ? Math.round((remaining / start) * 100) : 0;

  return (
    <div className={`wb-stock is-${state}`}>
      <div className="wb-stock-top">
        <b>{state === "sold_out" ? "Sold out for this week" : stockLabel(availability)}</b>
        {state !== "sold_out" ? <span>of {start} made</span> : null}
      </div>
      <div
        className="wb-stock-meter"
        role="meter"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={start}
        aria-label={`${remaining} of ${start} boxes remaining`}
      >
        <span style={{ width: `${Math.max(state === "sold_out" ? 0 : 4, pct)}%` }} />
      </div>
      <p className="wb-stock-note">
        {state === "sold_out"
          ? "This week's box is gone. A new box is posted each week."
          : state === "low"
            ? "Almost gone — these go fast once they're down to the last few."
            : "Limited run. Once this week's boxes are claimed, that's it."}
      </p>
    </div>
  );
}
