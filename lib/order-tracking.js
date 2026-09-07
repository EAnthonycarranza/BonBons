export const ORDER_STATUSES = [
  { value: "pending", label: "New request" },
  { value: "contacted", label: "Customer contacted" },
  { value: "confirmed", label: "Order Confirmed" },
  { value: "preparing", label: "In preparation" },
  { value: "ready", label: "Ready for pickup" },
  { value: "collected", label: "Picked up" },
  { value: "cancelled", label: "Cancelled" },
];

export const QUOTE_STATUSES = [
  { value: "new", label: "New request" },
  { value: "contacted", label: "Customer contacted" },
  { value: "quoted", label: "Quote sent" },
  { value: "booked", label: "Order Confirmed" },
  { value: "preparing", label: "In preparation" },
  { value: "ready", label: "Ready for pickup" },
  { value: "closed", label: "Picked up / closed" },
  { value: "cancelled", label: "Cancelled" },
];

export const PAYMENT_STATUSES = [
  { value: "not_arranged", label: "Not arranged" },
  { value: "instructions_sent", label: "Instructions sent" },
  { value: "paid_cash", label: "Paid in cash" },
  { value: "paid_direct", label: "Paid as arranged" },
];

export const ORDER_STATUS_VALUES = ORDER_STATUSES.map((item) => item.value);
export const QUOTE_STATUS_VALUES = QUOTE_STATUSES.map((item) => item.value);
export const PAYMENT_STATUS_VALUES = PAYMENT_STATUSES.map((item) => item.value);
