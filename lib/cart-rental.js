/**
 * The cake-pop cart for events. It's a small cart, so party size is offered
 * as three tiers rather than a free number — the largest tier is the most the
 * cart can serve. Adjust the numbers here; nothing else hardcodes them.
 */
export const CART_PARTY_SIZES = [
  { id: "small",  label: "Small",  range: "Up to 25 guests", max: 25 },
  { id: "medium", label: "Medium", range: "26–50 guests",    max: 50 },
  { id: "large",  label: "Large",  range: "51–75 guests",    max: 75, note: "The most the cart can serve" },
];

export const EVENT_TYPE_OTHER = "Other";

export const CART_EVENT_TYPES = [
  "Birthday",
  "Baby shower",
  "Bridal shower",
  "Wedding",
  "Quinceañera",
  "Graduation",
  "Corporate event",
  "School or church event",
  EVENT_TYPE_OTHER,
];

export function partySizeById(id) {
  return CART_PARTY_SIZES.find((size) => size.id === id) || null;
}

/**
 * Quotes store the tier's upper bound in the integer `guests` column, so no
 * schema change was needed. Rendering maps it back to the tier; a number that
 * isn't a tier boundary (older requests, or an imported spreadsheet) is shown
 * as it was entered.
 */
export function partySizeLabel(guests) {
  const n = Number(guests);
  if (!Number.isFinite(n) || n <= 0) return "";
  const tier = CART_PARTY_SIZES.find((size) => size.max === n);
  return tier ? `${tier.label} · ${tier.range}` : `${n} guests`;
}

/** Turn the form's event-type choice into what gets stored in `occasion`. */
export function resolveEventType(eventType, other) {
  const type = String(eventType || "").trim();
  if (type === EVENT_TYPE_OTHER) return String(other || "").trim().slice(0, 120);
  return CART_EVENT_TYPES.includes(type) ? type : "";
}
