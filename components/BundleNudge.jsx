"use client";

import { money } from "@/lib/format";

export default function BundleNudge({
  singlePopCount,
  suggestedFourPacks,
  potentialSavings,
  onConvert,
  compact = false,
}) {
  if (!suggestedFourPacks) return null;

  const popsToSwitch = suggestedFourPacks * 4;
  const packLabel = `${suggestedFourPacks} four-pack${suggestedFourPacks === 1 ? "" : "s"}`;

  return (
    <div className={`bundle-nudge${compact ? " compact" : ""}`}>
      <div>
        <span className="bundle-nudge-kicker">A better-value option</span>
        <b>You have {singlePopCount} single cake pops.</b>
        <p>
          Keep them as $4 singles, or switch {popsToSwitch} of them to {packLabel}
          {singlePopCount > popsToSwitch ? ` and keep ${singlePopCount - popsToSwitch} as singles` : ""}.
        </p>
      </div>
      <button className="bundle-nudge-action" type="button" onClick={onConvert}>
        Switch to {packLabel} · save {money(potentialSavings)}
      </button>
      <small>Nothing changes unless you choose this option.</small>
    </div>
  );
}
