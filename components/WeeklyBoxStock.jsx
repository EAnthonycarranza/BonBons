import { stockLabel } from "@/lib/weekly-box";

/**
 * The availability read-out. `state` comes from stockState() so the wording and the
 * meter can never disagree with what the order pipeline will actually accept.
 */
export default function WeeklyBoxStock({ availability, total }) {
  const { state, remaining } = availability;
  const start = Math.max(Number(total) || 0, remaining);
  const pct = start > 0 ? Math.round((remaining / start) * 100) : 0;

  return (
    <div className={`wb-stock is-${state}`}>
      <div className="wb-stock-top">
        <b>{state === "sold_out" ? "Sold out for this week" : stockLabel(availability) || "Available this week"}</b>
        {availability.tracked && state !== "sold_out" ? <span>boxes this week</span> : null}
      </div>
      {availability.tracked && start > 0 && <div
        className="wb-stock-meter"
        role="meter"
        aria-valuenow={remaining}
        aria-valuemin={0}
        aria-valuemax={start}
        aria-label={`${remaining} of ${start} boxes remaining`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>}
      <p className="wb-stock-note">
        {state === "sold_out"
          ? "Keep an eye out for the next weekly selection."
          : state === "low"
            ? "A few boxes remain in this batch. Availability is confirmed by Bonnie."
            : "A limited batch, available while supplies last."}
      </p>
    </div>
  );
}
