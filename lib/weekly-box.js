// Pure helpers only — no server-only imports, so the order pipeline and its
// tests can use these without pulling in the Supabase client.
import { stockState } from "../supabase/functions/_shared/menu.js";

export const WEEKLY_BOX_KEY_PREFIX = "weekly-box-";
export const DEFAULT_SINGLE_POP_PRICE = 4;
export const DEFAULT_FOUR_PACK_PRICE = 10;
export const DEFAULT_BOX_PRICE = 25;

export function weeklyBoxStock(box) {
  if (!box) return { tracked: true, state: "sold_out", remaining: 0 };
  return stockState(box.stockQuantity, box.lowStockThreshold);
}

export function weeklyBoxCartKey(box) {
  return `${WEEKLY_BOX_KEY_PREFIX}${box.slug}`;
}

export function isWeeklyBoxKey(key) {
  return String(key || "").startsWith(WEEKLY_BOX_KEY_PREFIX);
}

/** Shopper-facing wording for a stock level, shared by every surface. */
export function stockLabel(availability) {
  if (!availability || !availability.tracked) return "";
  if (availability.state === "sold_out") return "Sold out";
  if (availability.state === "low") {
    return availability.remaining === 1 ? "Only 1 left" : `Only ${availability.remaining} left`;
  }
  return `${availability.remaining} available`;
}
