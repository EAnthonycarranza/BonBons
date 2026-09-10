"use client";

import { money } from "@/lib/format";
import { usePrices } from "./PricesProvider";
import { useCart } from "./CartProvider";
import { bundlePrices } from "@/lib/bundles";

/**
 * Offers the better-value bundle for whatever is loose in the cart. One nudge
 * per group, so a cart holding both cake pops and pretzel rods is offered both
 * deals and taking one leaves the other alone.
 */
export default function BundleNudge({ compact = false }) {
  const prices = usePrices();
  const { bundleGroups = [], convertSinglesToBundles } = useCart();
  const offers = bundleGroups.filter((group) => group.suggestedPacks > 0);
  if (!offers.length) return null;

  return (
    <>
      {offers.map((group) => {
        const { single } = bundlePrices(group.key, prices);
        const unitsToSwitch = group.suggestedPacks * group.size;
        const packLabel = `${group.suggestedPacks} ${group.suggestedPacks === 1 ? group.packName : group.packNamePlural}`;
        const remainder = group.singleCount - unitsToSwitch;

        return (
          <div className={`bundle-nudge${compact ? " compact" : ""}`} key={group.key}>
            <div>
              <span className="bundle-nudge-kicker">A better-value option</span>
              <b>
                You have {group.singleCount} single{" "}
                {group.singleCount === 1 ? group.noun : group.nounPlural}.
              </b>
              <p>
                Keep them as {money(single)} singles, or switch {unitsToSwitch} of them to {packLabel}
                {remainder > 0 ? ` and keep ${remainder} as singles` : ""}.
              </p>
            </div>
            <button
              className="bundle-nudge-action"
              type="button"
              onClick={() => convertSinglesToBundles(group.key)}
            >
              Switch to {packLabel} · save {money(group.potentialSavings)}
            </button>
            <small>Nothing changes unless you choose this option.</small>
          </div>
        );
      })}
    </>
  );
}
