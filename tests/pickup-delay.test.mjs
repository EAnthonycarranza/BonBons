import test from "node:test";
import assert from "node:assert/strict";
import { pickupDateState, isPickupOverdue, AWAITING_PICKUP_STATUSES } from "../lib/order-tracking.js";
import { buildOrderEmail } from "../lib/email-template.js";

const NOW = new Date(2026, 8, 15, 10, 0); // 15 Sep 2026, local

const order = {
  orderNumber: "BB-26-1002",
  status: "preparing",
  customer: { name: "Jane", email: "jane@example.com" },
  items: [{ name: "Cookie Monster", qty: 2, price: 3, description: "" }],
  subtotal: 6,
  confirmedTotal: 6,
  pickupDate: "2026-10-12",
  pickupTime: "14:30",
  pickupLocation: "13435 West Ave, San Antonio, TX",
  paymentStatus: "not_arranged",
};

test("a pickup only counts as overdue while the customer is still owed one", () => {
  for (const status of AWAITING_PICKUP_STATUSES) {
    assert.equal(pickupDateState({ status, pickupDate: "2026-09-14" }, NOW), "overdue", status);
  }
  // Settled or not yet confirmed: the date is history, not a problem.
  for (const status of ["collected", "closed", "cancelled", "pending", "new", "contacted", "quoted"]) {
    assert.equal(pickupDateState({ status, pickupDate: "2026-09-14" }, NOW), "none", status);
  }
});

test("today is its own state, so a same-day pickup is never called late", () => {
  assert.equal(pickupDateState({ status: "confirmed", pickupDate: "2026-09-15" }, NOW), "today");
  assert.equal(pickupDateState({ status: "confirmed", pickupDate: "2026-09-16" }, NOW), "upcoming");
  assert.equal(isPickupOverdue({ status: "confirmed", pickupDate: "2026-09-15" }, NOW), false);
});

test("a date-only value is read in local time, not shifted a day by UTC", () => {
  // Late in the evening, a UTC reading of "today" would already be tomorrow and
  // could mark a same-day pickup as overdue.
  const lateEvening = new Date(2026, 8, 15, 23, 30);
  assert.equal(pickupDateState({ status: "confirmed", pickupDate: "2026-09-15" }, lateEvening), "today");
  const earlyMorning = new Date(2026, 8, 15, 0, 15);
  assert.equal(pickupDateState({ status: "confirmed", pickupDate: "2026-09-15" }, earlyMorning), "today");
});

test("records with no usable date are left alone", () => {
  for (const record of [null, undefined, {}, { status: "confirmed" }, { status: "confirmed", pickupDate: "nonsense" }]) {
    assert.equal(pickupDateState(record, NOW), "none");
  }
  // A confirmed order falls back to the requested date when no pickup is set.
  assert.equal(pickupDateState({ status: "confirmed", wantedDate: "2026-09-01" }, NOW), "overdue");
});

test("a delay update names the new date and offers the phone number", () => {
  const email = buildOrderEmail({ record: order, kind: "orders", emailType: "status_update", delayNotice: true });
  assert.match(email.subject, /pickup date has changed/i);
  assert.match(email.html, /rescheduled/i);
  assert.match(email.html, /October 12, 2026/);
  assert.ok(email.html.includes("(210) 721-3983"));
  assert.match(email.text, /YOUR PICKUP HAS BEEN RESCHEDULED/);
  assert.ok(email.text.includes("(210) 721-3983"));
});

test("with no new date the delay update asks them to call instead", () => {
  const email = buildOrderEmail({
    record: { ...order, pickupDate: "", pickupTime: "" },
    kind: "orders", emailType: "status_update", delayNotice: true,
  });
  assert.match(email.html, /agree a new pickup date/i);
  assert.ok(email.html.includes("(210) 721-3983"));
  assert.match(email.text, /call or text \(210\) 721-3983/);
});

test("an ordinary update is unchanged and never mentions a reschedule", () => {
  const email = buildOrderEmail({ record: order, kind: "orders", emailType: "status_update" });
  assert.match(email.subject, /update: In preparation/);
  assert.equal(/rescheduled/i.test(email.html), false);
  assert.equal(/RESCHEDULED/.test(email.text), false);
});

test("receipts and confirmations cannot carry a delay notice", () => {
  const confirmation = buildOrderEmail({ record: order, kind: "orders", emailType: "confirmation", delayNotice: true });
  assert.match(confirmation.subject, /confirmed/);
  assert.equal(/rescheduled/i.test(confirmation.html), false);

  const receipt = buildOrderEmail({
    record: { ...order, orderNumber: "", status: "pending" },
    kind: "orders", emailType: "request_received", delayNotice: true,
  });
  assert.equal(/rescheduled/i.test(receipt.html), false);
});

// --- Date / time picker value handling -------------------------------------

test("picker date values round-trip in local time, without a UTC day shift", async () => {
  const { parseDateValue, formatDateValue } = await import("../lib/date-values.js");
  const parsed = parseDateValue("2026-09-15");
  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 15);
  // Formatting must name the same calendar day it was given.
  assert.match(formatDateValue("2026-09-15"), /Sep 15, 2026/);
  assert.match(formatDateValue("2026-01-01"), /Jan 1, 2026/);
  for (const bad of ["", null, undefined, "nonsense", "2026-13-45x"]) {
    assert.equal(parseDateValue(bad), null);
    assert.equal(formatDateValue(bad), "");
  }
});

test("times display in 12-hour form and survive an unusual stored value", async () => {
  const { formatTimeValue } = await import("../lib/date-values.js");
  assert.equal(formatTimeValue("14:30"), "2:30 PM");
  assert.equal(formatTimeValue("00:05"), "12:05 AM");
  assert.equal(formatTimeValue("12:00"), "12:00 PM");
  assert.equal(formatTimeValue("09:15"), "9:15 AM");
  // Seconds from the database must not break the label.
  assert.equal(formatTimeValue("16:45:00"), "4:45 PM");
  for (const bad of ["", null, undefined, "nope"]) assert.equal(formatTimeValue(bad), "");
});

test("pickup slots cover the shop day and keep an off-grid stored time", async () => {
  const { pickupSlots } = await import("../lib/date-values.js");
  const standard = pickupSlots("");
  assert.equal(standard[0], "07:00");
  assert.equal(standard[standard.length - 1], "20:00");
  assert.equal(standard.includes("12:45"), true);
  assert.equal(standard.includes("06:45"), false);

  // An imported 2:37pm must remain selectable rather than being snapped away.
  const withOdd = pickupSlots("14:37");
  assert.equal(withOdd.includes("14:37"), true);
  assert.equal(withOdd.length, standard.length + 1);
  // A slot already on the grid is not duplicated.
  assert.equal(pickupSlots("14:30").length, standard.length);
});

test("impossible dates are rejected rather than rolling into the next month", async () => {
  const { parseDateValue } = await import("../lib/date-values.js");
  assert.equal(parseDateValue("2026-02-31"), null);
  assert.equal(parseDateValue("2026-13-01"), null);
  assert.equal(parseDateValue("2026-00-10"), null);
  // A real leap day still parses.
  assert.equal(parseDateValue("2028-02-29").getDate(), 29);
});
