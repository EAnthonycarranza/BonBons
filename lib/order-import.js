// Spreadsheet import/export for pickup orders. Pure functions so the parsing
// rules can be tested without a browser or a database.

export const ORDER_EXPORT_COLUMNS = [
  "Order number",
  "Status",
  "Payment",
  "Customer",
  "Email",
  "Phone",
  "Wanted date",
  "Pickup date",
  "Pickup time",
  "Pickup location",
  "Items",
  "Subtotal",
  "Confirmed total",
  "Customer notes",
  "Staff notes",
  "Received",
];

// Accepted spreadsheet headings, lower-cased. Several spellings map to the same
// field so an owner's own sheet is likely to import without being rewritten.
const HEADER_ALIASES = {
  "order number": "orderNumber", "order #": "orderNumber", "order": "orderNumber",
  "status": "status", "order status": "status", "stage": "status",
  "payment": "paymentStatus", "payment status": "paymentStatus",
  "customer": "name", "customer name": "name", "name": "name",
  "email": "email", "customer email": "email", "e-mail": "email",
  "phone": "phone", "customer phone": "phone", "telephone": "phone", "mobile": "phone",
  "wanted date": "wantedDate", "date": "wantedDate", "pickup date": "wantedDate",
  "date wanted": "wantedDate", "needed": "wantedDate", "needed by": "wantedDate",
  "items": "items", "item": "items", "order items": "items", "products": "items",
  "subtotal": "subtotal", "total": "subtotal", "amount": "subtotal", "price": "subtotal",
  "customer notes": "notes", "notes": "notes", "note": "notes",
  "staff notes": "adminNotes", "admin notes": "adminNotes", "internal notes": "adminNotes",
};

const STATUSES = new Set(["pending", "contacted", "confirmed", "preparing", "ready", "collected", "cancelled"]);
const PAYMENTS = new Set(["not_arranged", "instructions_sent", "paid_cash", "paid_direct"]);

export function normalizeHeader(header) {
  return String(header ?? "").trim().toLowerCase().replace(/[_\s]+/g, " ");
}

export function mapHeaders(headers) {
  const mapped = {};
  headers.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key && !(key in mapped)) mapped[key] = index;
  });
  return mapped;
}

/** Excel serial dates, ISO strings and common US formats all land on ISO. */
export function toIsoDate(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel's epoch is 1899-12-30 (its leap-year bug included).
    const ms = Math.round((value - 25569) * 86400 * 1000);
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const us = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (us) {
    const [, m, d, y] = us;
    const year = y.length === 2 ? `20${y}` : y;
    const iso = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    return Number.isNaN(Date.parse(iso)) ? "" : iso;
  }
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? "" : new Date(parsed).toISOString().slice(0, 10);
}

export function toMoney(value) {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const number = Number.parseFloat(cleaned);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function isEmailish(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

/**
 * Turn sheet rows into orders, collecting per-row problems rather than
 * throwing, so the owner sees everything wrong with the file at once.
 */
export function parseOrderRows(rows, { maxRows = 500 } = {}) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return { orders: [], errors: [{ row: 0, message: "The file needs a header row and at least one order." }], skipped: 0 };
  }
  const columns = mapHeaders(rows[0]);
  const missing = ["name", "email", "wantedDate"].filter((key) => !(key in columns));
  if (missing.length) {
    const labels = { name: "Customer", email: "Email", wantedDate: "Wanted date" };
    return {
      orders: [],
      errors: [{ row: 1, message: `The file is missing a ${missing.map((k) => labels[k]).join(", ")} column.` }],
      skipped: 0,
    };
  }

  const orders = [];
  const errors = [];
  let skipped = 0;
  const body = rows.slice(1);

  if (body.length > maxRows) {
    errors.push({ row: 0, message: `Only the first ${maxRows} rows are imported; this file has ${body.length}.` });
  }

  body.slice(0, maxRows).forEach((row, index) => {
    const sheetRow = index + 2; // 1-based, plus the header
    const cell = (key) => (key in columns ? row[columns[key]] : undefined);
    const isBlank = !row || row.every((value) => value === null || value === undefined || String(value).trim() === "");
    if (isBlank) { skipped += 1; return; }

    const name = String(cell("name") ?? "").trim();
    const email = String(cell("email") ?? "").trim().toLowerCase();
    const wantedDate = toIsoDate(cell("wantedDate"));
    const problems = [];
    if (!name) problems.push("a customer name");
    if (!isEmailish(email)) problems.push("a valid email");
    if (!wantedDate) problems.push("a readable date");
    if (problems.length) {
      errors.push({ row: sheetRow, message: `Row ${sheetRow} needs ${problems.join(" and ")}.` });
      return;
    }

    const itemsText = String(cell("items") ?? "").trim();
    const subtotal = toMoney(cell("subtotal"));
    const status = String(cell("status") ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const payment = String(cell("paymentStatus") ?? "").trim().toLowerCase().replace(/\s+/g, "_");

    orders.push({
      customer_name: name.slice(0, 200),
      customer_email: email.slice(0, 200),
      customer_phone: String(cell("phone") ?? "").trim().slice(0, 60),
      wanted_date: wantedDate,
      // The orders table requires at least one item, so an imported row always
      // carries a line describing what the sheet said.
      items: [{
        key: "imported",
        name: itemsText || "Imported order",
        description: itemsText ? "" : "Imported from a spreadsheet",
        price: subtotal,
        qty: 1,
        bundleEligible: false,
      }],
      subtotal,
      notes: String(cell("notes") ?? "").trim().slice(0, 2000),
      admin_notes: [String(cell("adminNotes") ?? "").trim(), `Imported from a spreadsheet (row ${sheetRow}).`]
        .filter(Boolean).join(" ").slice(0, 2000),
      status: STATUSES.has(status) ? status : "pending",
      payment_status: PAYMENTS.has(payment) ? payment : "not_arranged",
    });
  });

  return { orders, errors, skipped };
}

/** One spreadsheet row per order, in the documented column order. */
export function ordersToRows(orders, { money = (n) => `$${Number(n || 0).toFixed(2)}` } = {}) {
  return orders.map((order) => [
    order.orderNumber || "",
    order.status || "",
    order.paymentStatus || "",
    order.customer?.name || "",
    order.customer?.email || "",
    order.customer?.phone || "",
    order.wantedDate || "",
    order.pickupDate || "",
    order.pickupTime || "",
    order.pickupLocation || "",
    (order.items || []).map((item) => `${item.name}${item.qty > 1 ? ` x${item.qty}` : ""}`).join("; "),
    money(order.subtotal || 0),
    order.confirmedTotal === null || order.confirmedTotal === undefined ? "" : money(order.confirmedTotal),
    order.notes || "",
    order.adminNotes || "",
    order.createdAt || "",
  ]);
}
