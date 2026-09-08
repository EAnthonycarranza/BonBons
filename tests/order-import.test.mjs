import test from "node:test";
import assert from "node:assert/strict";
import {
  parseOrderRows,
  ordersToRows,
  toIsoDate,
  toMoney,
  mapHeaders,
  ORDER_EXPORT_COLUMNS,
} from "../lib/order-import.js";

const HEADERS = ["Customer", "Email", "Phone", "Wanted date", "Items", "Subtotal", "Status", "Payment", "Notes"];
const ROW = ["Jane Doe", "Jane@Example.com ", "(210) 555-0111", "2026-10-01", "Cookie Monster x4", "$12.00", "confirmed", "paid_cash", "Birthday"];

test("headers are matched case-insensitively and by common aliases", () => {
  const mapped = mapHeaders(["CUSTOMER NAME", "E-Mail", "Telephone", "Date Wanted", "Order Items", "Total"]);
  assert.equal(mapped.name, 0);
  assert.equal(mapped.email, 1);
  assert.equal(mapped.phone, 2);
  assert.equal(mapped.wantedDate, 3);
  assert.equal(mapped.items, 4);
  assert.equal(mapped.subtotal, 5);
});

test("dates arrive as ISO from Excel serials, ISO text, and US formats", () => {
  assert.equal(toIsoDate("2026-10-01"), "2026-10-01");
  assert.equal(toIsoDate("10/1/2026"), "2026-10-01");
  assert.equal(toIsoDate("10/01/26"), "2026-10-01");
  assert.equal(toIsoDate(new Date("2026-10-01T12:00:00Z")), "2026-10-01");
  // Excel serial for 2026-10-01.
  assert.equal(toIsoDate(46296), "2026-10-01");
  for (const bad of ["", null, undefined, "not a date"]) assert.equal(toIsoDate(bad), "");
});

test("money tolerates currency symbols, commas, and rubbish", () => {
  assert.equal(toMoney("$12.00"), 12);
  assert.equal(toMoney("1,250.50"), 1250.5);
  assert.equal(toMoney(9.5), 9.5);
  assert.equal(toMoney("-5"), 0);
  for (const bad of ["", null, undefined, "free"]) assert.equal(toMoney(bad), 0);
});

test("a good row becomes a normalised order", () => {
  const { orders, errors } = parseOrderRows([HEADERS, ROW]);
  assert.equal(errors.length, 0);
  assert.equal(orders.length, 1);
  const [order] = orders;
  assert.equal(order.customer_name, "Jane Doe");
  assert.equal(order.customer_email, "jane@example.com");
  assert.equal(order.wanted_date, "2026-10-01");
  assert.equal(order.subtotal, 12);
  assert.equal(order.status, "confirmed");
  assert.equal(order.payment_status, "paid_cash");
  // The orders table requires a non-empty items array.
  assert.equal(order.items.length, 1);
  assert.equal(order.items[0].name, "Cookie Monster x4");
  assert.match(order.admin_notes, /row 2/i);
});

test("unknown statuses fall back rather than reaching the database", () => {
  const row = [...ROW];
  row[6] = "whatever";
  row[7] = "bitcoin";
  const [order] = parseOrderRows([HEADERS, row]).orders;
  assert.equal(order.status, "pending");
  assert.equal(order.payment_status, "not_arranged");
});

test("bad rows are reported individually and never silently dropped", () => {
  const rows = [
    HEADERS,
    ROW,
    ["", "someone@example.com", "", "2026-10-02", "", "", "", "", ""],      // no name
    ["No Email", "not-an-email", "", "2026-10-03", "", "", "", "", ""],      // bad email
    ["No Date", "ok@example.com", "", "gibberish", "", "", "", "", ""],      // bad date
  ];
  const { orders, errors } = parseOrderRows(rows);
  assert.equal(orders.length, 1);
  assert.equal(errors.length, 3);
  assert.match(errors[0].message, /Row 3 needs a customer name/);
  assert.match(errors[1].message, /Row 4 needs a valid email/);
  assert.match(errors[2].message, /Row 5 needs a readable date/);
});

test("blank rows are skipped, not treated as failures", () => {
  const { orders, errors, skipped } = parseOrderRows([HEADERS, ROW, ["", "", "", "", "", "", "", "", ""], [null, null]]);
  assert.equal(orders.length, 1);
  assert.equal(errors.length, 0);
  assert.equal(skipped, 2);
});

test("a file missing a required column is refused with a useful message", () => {
  const { orders, errors } = parseOrderRows([["Customer", "Items"], ["Jane", "Pops"]]);
  assert.equal(orders.length, 0);
  assert.match(errors[0].message, /missing a Email, Wanted date column/);
  // An empty or header-only file is refused too.
  assert.match(parseOrderRows([]).errors[0].message, /header row/);
  assert.match(parseOrderRows([HEADERS]).errors[0].message, /header row/);
});

test("imports are capped so one paste cannot flood the desk", () => {
  const many = Array.from({ length: 12 }, () => ROW);
  const { orders, errors } = parseOrderRows([HEADERS, ...many], { maxRows: 10 });
  assert.equal(orders.length, 10);
  assert.match(errors[0].message, /Only the first 10 rows/);
});

test("export rows line up with the documented columns", () => {
  const [row] = ordersToRows([{
    orderNumber: "BB-1001", status: "confirmed", paymentStatus: "paid_cash",
    customer: { name: "Jane", email: "jane@example.com", phone: "210" },
    wantedDate: "2026-10-01", pickupDate: "2026-10-02", pickupTime: "10:00",
    pickupLocation: "West Ave", items: [{ name: "Cookie Monster", qty: 4 }, { name: "Biscoff", qty: 1 }],
    subtotal: 12, confirmedTotal: null, notes: "n", adminNotes: "a", createdAt: "2026-09-01",
  }]);
  assert.equal(row.length, ORDER_EXPORT_COLUMNS.length);
  assert.equal(row[0], "BB-1001");
  assert.equal(row[10], "Cookie Monster x4; Biscoff");
  // A pending total exports as blank, not as "$0.00".
  assert.equal(row[12], "");
});
