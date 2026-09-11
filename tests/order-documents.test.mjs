import test from "node:test";
import assert from "node:assert/strict";
import zlib from "node:zlib";
import { buildOrderDocument, documentFilename, documentLines } from "../lib/order-pdf.js";
import { buildOrderEmail } from "../lib/email-template.js";

const order = {
  orderNumber: "BB-26-1002",
  status: "confirmed",
  paymentStatus: "paid_cash",
  confirmedAt: "2026-09-08T12:00:00Z",
  customer: { name: "Jane Doe", email: "jane@example.com", phone: "(210) 555-0111" },
  items: [
    { name: "Cake Pop Four-Pack (4 pc)", description: "Cookie Monster x2, Biscoff x2", price: 10, qty: 2 },
    { name: "Cookie Monster", description: "A single handmade cake pop", price: 3, qty: 4 },
  ],
  subtotal: 32,
  confirmedTotal: 32,
  pickupDate: "2026-09-15",
  pickupTime: "14:30",
  pickupLocation: "13435 West Ave, San Antonio, TX 78216, United States",
};

const quote = {
  orderNumber: "BB-26-1004",
  status: "booked",
  paymentStatus: "paid_direct",
  name: "Sam Rivera",
  email: "sam@example.com",
  phone: "(210) 555-0122",
  occasion: "Baby shower",
  guests: 24,
  interests: ["Cookie Monster", "Biscoff"],
  colors: "Blue and gold",
  confirmedTotal: 96,
  pickupDate: "2026-10-02",
};

/**
 * Text drawn into the document.
 *
 * pdf-lib Flate-compresses its content streams, so the visible words are not
 * present as plain bytes; each stream is inflated and the text-showing
 * operators are pulled out.
 */
function pdfText(buffer) {
  const raw = buffer.toString("latin1");
  let out = "";
  const pattern = /stream\r?\n/g;
  let match;
  while ((match = pattern.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    try {
      const inflated = zlib.inflateSync(Buffer.from(raw.slice(start, end), "latin1")).toString("latin1");
      // pdf-lib emits hex strings; literals are handled too for completeness.
      for (const [, hex] of inflated.matchAll(/<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
        out += Buffer.from(hex.replace(/\s+/g, ""), "hex").toString("latin1") + "\n";
      }
      for (const [, literal] of inflated.matchAll(/\(((?:\\.|[^\\)])*)\)\s*Tj/g)) {
        out += literal.replace(/\\([()\\])/g, "$1") + "\n";
      }
    } catch {
      // Not a Flate stream (an embedded image, say) — nothing to read here.
    }
  }
  return out;
}

test("both documents are real PDFs with a sensible filename", async () => {
  for (const kind of ["confirmation", "invoice"]) {
    const buffer = await buildOrderDocument({ record: order, kind: "orders", documentKind: kind });
    assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
    assert.ok(buffer.length > 1000, `${kind} looks empty`);
    // Comfortably emailable — the full-size logo once made this ~600KB.
    assert.ok(buffer.length < 120_000, `${kind} is too large to attach: ${buffer.length}`);
  }
  assert.equal(documentFilename(order, "invoice"), "BonBons-Invoice-BB-26-1002.pdf");
  assert.equal(documentFilename(order, "confirmation"), "BonBons-Confirmation-BB-26-1002.pdf");
  // A missing order number must not produce a file called "undefined".
  assert.equal(documentFilename({}, "invoice"), "BonBons-Invoice-order.pdf");
});

test("a document cannot be produced without an order number", async () => {
  await assert.rejects(
    () => buildOrderDocument({ record: { ...order, orderNumber: "" }, kind: "orders", documentKind: "invoice" }),
    /order number is required/i
  );
  await assert.rejects(
    () => buildOrderDocument({ record: order, kind: "orders", documentKind: "receipt" }),
    /Unknown document kind/i
  );
});

test("the invoice is marked paid and the confirmation is not", async () => {
  const invoice = pdfText(await buildOrderDocument({ record: order, kind: "orders", documentKind: "invoice" }));
  assert.match(invoice, /INVOICE/);
  assert.match(invoice, /PAID IN FULL/);

  const confirmation = pdfText(await buildOrderDocument({ record: order, kind: "orders", documentKind: "confirmation" }));
  assert.match(confirmation, /ORDER CONFIRMATION/);
  assert.equal(/PAID IN FULL/.test(confirmation), false);
});

test("an unpaid invoice says so rather than claiming payment", async () => {
  const unpaid = pdfText(await buildOrderDocument({
    record: { ...order, paymentStatus: "not_arranged" }, kind: "orders", documentKind: "invoice",
  }));
  assert.equal(/PAID IN FULL/.test(unpaid), false);
  assert.match(unpaid, /has not been recorded/i);
});

test("custom requests become a single descriptive line", () => {
  const [line] = documentLines(quote, "quotes");
  assert.equal(line.name, "Cake-pop cart rental");
  assert.equal(line.amount, 96);
  assert.match(line.detail, /Baby shower/);
  assert.match(line.detail, /Cookie Monster, Biscoff/);
  assert.match(line.detail, /Blue and gold/);
});

test("menu order lines multiply price by quantity", () => {
  const lines = documentLines(order, "orders");
  assert.equal(lines.length, 2);
  assert.equal(lines[0].amount, 20);
  assert.equal(lines[1].amount, 12);
  // An order with no items must not throw.
  assert.deepEqual(documentLines({ items: [] }, "orders"), []);
});

test("a custom request produces a document too", async () => {
  const buffer = await buildOrderDocument({ record: quote, kind: "quotes", documentKind: "invoice" });
  assert.equal(buffer.subarray(0, 5).toString(), "%PDF-");
  assert.match(pdfText(buffer), /Cake-pop cart rental/);
});

test("a paid invoice email refuses to go out on an unpaid order", () => {
  for (const paymentStatus of ["not_arranged", "instructions_sent"]) {
    assert.throws(
      () => buildOrderEmail({ record: { ...order, paymentStatus }, kind: "orders", emailType: "paid_invoice" }),
      /only be sent once the order is marked as paid/i
    );
  }
  for (const paymentStatus of ["paid_cash", "paid_direct"]) {
    const email = buildOrderEmail({ record: { ...order, paymentStatus }, kind: "orders", emailType: "paid_invoice" });
    assert.match(email.subject, /paid in full/i);
  }
});

test("the invoice email needs an order number and mentions its attachment", () => {
  assert.throws(
    () => buildOrderEmail({ record: { ...order, orderNumber: "" }, kind: "orders", emailType: "paid_invoice" }),
    /order number is required/i
  );
  const email = buildOrderEmail({ record: order, kind: "orders", emailType: "paid_invoice" });
  assert.match(email.html, /attached as a PDF/i);
  assert.match(email.text, /attached to this email as a PDF/i);
  assert.match(email.html, /Payment received/i);
});

test("the confirmation email advertises its PDF; a status update does not", () => {
  const confirmation = buildOrderEmail({ record: order, kind: "orders", emailType: "confirmation" });
  assert.match(confirmation.html, /order confirmation<\/strong> is attached as a PDF|is attached as a PDF/i);

  const update = buildOrderEmail({ record: order, kind: "orders", emailType: "status_update" });
  assert.equal(/is attached as a PDF/i.test(update.html), false);
});
