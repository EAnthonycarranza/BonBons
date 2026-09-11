export const ORDER_STATUSES = [
  { value: "pending", label: "New request" },
  { value: "contacted", label: "Customer contacted" },
  { value: "confirmed", label: "Order Confirmed" },
  { value: "preparing", label: "In preparation" },
  { value: "ready", label: "Ready for pickup" },
  { value: "collected", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
];

// Cart rentals (the quotes table). Same values as before — only the labels
// changed, so nothing stored is affected — but worded for an event the cart
// goes to rather than an order the customer collects.
export const QUOTE_STATUSES = [
  { value: "new", label: "New request" },
  { value: "contacted", label: "Customer contacted" },
  { value: "quoted", label: "Quote sent" },
  { value: "booked", label: "Cart booked" },
  { value: "preparing", label: "In preparation" },
  { value: "ready", label: "Ready for the event" },
  { value: "closed", label: "Event done / closed" },
  { value: "cancelled", label: "Cancelled" },
];

export const PAYMENT_STATUSES = [
  { value: "not_arranged", label: "Not arranged" },
  { value: "instructions_sent", label: "Instructions sent" },
  // Customer-set: they told us they'll bring cash. Intent, not money received.
  { value: "cash_at_pickup", label: "Cash at pickup (customer chose)" },
  { value: "paid_cash", label: "Paid in cash" },
  { value: "paid_direct", label: "Paid as arranged" },
];

/** The only two statuses that mean money actually arrived. */
export const PAID_STATUSES = ["paid_cash", "paid_direct"];
export const isPaidStatus = (status) => PAID_STATUSES.includes(status);
export const CASH_AT_PICKUP = "cash_at_pickup";

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((item) => item.value);
export const QUOTE_STATUS_VALUES = QUOTE_STATUSES.map((item) => item.value);
export const PAYMENT_STATUS_VALUES = PAYMENT_STATUSES.map((item) => item.value);

// Stages where a pickup is still owed to the customer. Picked up, closed and
// cancelled are settled, so their dates are history rather than a problem.
export const AWAITING_PICKUP_STATUSES = ["confirmed", "booked", "preparing", "ready"];

/** Local midnight, so "overdue" is judged by calendar day, not by clock time. */
function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function pickupDay(value) {
  if (!value) return null;
  const text = String(value);
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  // A date-only string is parsed in local time; parsing it as UTC would shift
  // the day for anyone west of Greenwich and mark today's pickups overdue.
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

/**
 * How a confirmed order's pickup date should read on the desk.
 * "overdue" means the day has passed and the customer still has not collected.
 */
export function pickupDateState(record, now = new Date()) {
  if (!record || !AWAITING_PICKUP_STATUSES.includes(record.status)) return "none";
  const day = pickupDay(record.pickupDate || record.wantedDate || record.eventDate);
  if (!day) return "none";
  const today = startOfToday(now);
  if (day.getTime() < today.getTime()) return "overdue";
  if (day.getTime() === today.getTime()) return "today";
  return "upcoming";
}

export function isPickupOverdue(record, now = new Date()) {
  return pickupDateState(record, now) === "overdue";
}
