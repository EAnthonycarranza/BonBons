// No `server-only` marker: this module is imported solely by server routes,
// and keeping it importable lets the document layout be tested directly.
import fs from "node:fs/promises";
import { partySizeLabel } from "./cart-rental.js";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SITE } from "./sample-data.js";
import { money } from "./format.js";
import { formatDateValue, formatTimeValue } from "./date-values.js";

// Standard fonts only — embedding a typeface would add megabytes to the slug
// for a document the customer reads once.
const PAGE = { width: 612, height: 792 };
const MARGIN = 54;
const INK = rgb(0.16, 0.09, 0.19);
const MUTED = rgb(0.42, 0.36, 0.45);
const PINK = rgb(0.66, 0.09, 0.4);
const RULE = rgb(0.87, 0.83, 0.88);
const PAID = rgb(0.13, 0.52, 0.38);

export const DOCUMENT_KINDS = ["confirmation", "invoice"];

function customerOf(record, kind) {
  return kind === "orders" ? record.customer || {} : record;
}

/** Line items for the document, from a menu order or a custom request. */
export function documentLines(record, kind) {
  if (kind === "orders") {
    return (record.items || []).map((item) => ({
      name: String(item.name || "Cake pops"),
      detail: String(item.description || ""),
      qty: Number(item.qty) || 1,
      amount: (Number(item.price) || 0) * (Number(item.qty) || 1),
    }));
  }
  const detail = [
    record.occasion ? `Event type: ${record.occasion}` : "",
    record.guests ? `Party size: ${partySizeLabel(record.guests)}` : "",
    record.interests?.length ? `Cake pops: ${record.interests.join(", ")}` : "",
    record.colors ? `Colors / theme: ${record.colors}` : "",
  ].filter(Boolean).join("  ·  ");
  return [{ name: "Cake-pop cart rental", detail, qty: 1, amount: Number(record.confirmedTotal) || 0 }];
}

function wrap(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Renders the pickup confirmation and the paid invoice.
 *
 * They are one layout because they describe the same order — only the title,
 * the payment block and the stamp differ. Keeping them together means the
 * customer's two documents can never disagree about what was ordered.
 */
export async function buildOrderDocument({ record, kind = "orders", documentKind = "confirmation" }) {
  if (!DOCUMENT_KINDS.includes(documentKind)) throw new Error("Unknown document kind.");
  if (!record?.orderNumber) throw new Error("An order number is required before a document can be produced.");

  const isInvoice = documentKind === "invoice";
  const customer = customerOf(record, kind);
  const lines = documentLines(record, kind);
  const total = record.confirmedTotal ?? (kind === "orders" ? record.subtotal : null);
  const paid = ["paid_cash", "paid_direct"].includes(record.paymentStatus);

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${isInvoice ? "Invoice" : "Order confirmation"} ${record.orderNumber} — ${SITE.name}`);
  pdf.setAuthor(SITE.name);
  pdf.setSubject(isInvoice ? "Paid invoice" : "Pickup order confirmation");
  pdf.setProducer(SITE.name);

  const page = pdf.addPage([PAGE.width, PAGE.height]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const body = await pdf.embedFont(StandardFonts.Helvetica);
  const contentWidth = PAGE.width - MARGIN * 2;
  let y = PAGE.height - MARGIN;

  const text = (value, { font = body, size = 10, color = INK, x = MARGIN } = {}) => {
    page.drawText(String(value), { x, y, size, font, color });
  };
  const right = (value, { font = body, size = 10, color = INK, edge = PAGE.width - MARGIN } = {}) => {
    const width = font.widthOfTextAtSize(String(value), size);
    page.drawText(String(value), { x: edge - width, y, size, font, color });
  };
  const rule = (gap = 10) => {
    y -= gap;
    page.drawLine({
      start: { x: MARGIN, y }, end: { x: PAGE.width - MARGIN, y },
      thickness: 0.75, color: RULE,
    });
  };

  // Letterhead. The logo is the same asset the emails embed.
  try {
    // A PDF-sized copy of the logo: the email asset is 620px/646KB and would
    // dominate the file size of a document that draws it at 64pt.
    const logoBytes = await fs.readFile(path.join(process.cwd(), "assets", "logo-pdf.png"));
    const logo = await pdf.embedPng(logoBytes);
    const size = 64;
    page.drawImage(logo, { x: MARGIN, y: y - size + 12, width: size, height: size });
  } catch {
    // A missing logo must not stop a customer receiving their document.
  }

  y -= 6;
  text(SITE.name, { font: bold, size: 17, x: MARGIN + 76 });
  y -= 15;
  text("Handmade cake pops  ·  San Antonio, Texas  ·  Pickup only", { size: 9, color: MUTED, x: MARGIN + 76 });
  y -= 13;
  text(`${SITE.email}  ·  ${SITE.phone}`, { size: 9, color: MUTED, x: MARGIN + 76 });

  y -= 34;
  text(isInvoice ? "INVOICE" : "ORDER CONFIRMATION", { font: bold, size: 22, color: PINK });
  if (isInvoice && paid) {
    right("PAID IN FULL", { font: bold, size: 13, color: PAID });
  }
  y -= 16;
  text(
    isInvoice
      ? "This invoice confirms payment has been received. Nothing further is due."
      : "Your order is confirmed. Please keep this for your pickup.",
    { size: 10, color: MUTED }
  );

  rule(18);
  y -= 20;

  // Reference and customer, side by side.
  const columnX = MARGIN + contentWidth / 2;
  text("ORDER NUMBER", { font: bold, size: 8, color: MUTED });
  page.drawText("BILLED TO", { x: columnX, y, size: 8, font: bold, color: MUTED });
  y -= 15;
  text(record.orderNumber, { font: bold, size: 14 });
  page.drawText(String(customer.name || "Customer"), { x: columnX, y, size: 11, font: bold, color: INK });
  y -= 14;
  const issued = isInvoice
    ? record.paidInvoiceSentAt || new Date().toISOString()
    : record.confirmedAt || new Date().toISOString();
  text(`Issued ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(issued))}`,
    { size: 9, color: MUTED });
  if (customer.email) {
    page.drawText(String(customer.email), { x: columnX, y, size: 9, font: body, color: MUTED });
    y -= 12;
  }
  if (customer.phone) {
    page.drawText(String(customer.phone), { x: columnX, y, size: 9, font: body, color: MUTED });
  }

  y -= 26;
  rule(0);
  y -= 18;

  // Items.
  text("DESCRIPTION", { font: bold, size: 8, color: MUTED });
  page.drawText("QTY", { x: PAGE.width - MARGIN - 130, y, size: 8, font: bold, color: MUTED });
  right("AMOUNT", { font: bold, size: 8, color: MUTED });
  rule(8);
  y -= 18;

  for (const line of lines) {
    text(line.name, { font: bold, size: 11 });
    page.drawText(String(line.qty), { x: PAGE.width - MARGIN - 130, y, size: 10, font: body, color: INK });
    right(money(line.amount), { font: bold, size: 11 });
    y -= 13;
    for (const detail of wrap(line.detail, body, 9, contentWidth - 150)) {
      text(detail, { size: 9, color: MUTED });
      y -= 11;
    }
    y -= 7;
  }

  rule(4);
  y -= 20;
  text(record.confirmedTotal != null ? "Confirmed total" : "Estimated total", { font: bold, size: 11 });
  right(total == null ? "To be confirmed" : money(total), { font: bold, size: 16, color: PINK });

  y -= 30;
  const paymentText = isInvoice
    ? paid
      ? `Paid in full — thank you! ${total == null ? "" : `${money(total)} received.`} No further payment is due.`
      : "Payment has not been recorded against this order yet."
    : record.paymentInstructions || SITE.paymentInstructions;
  // Measure first so the panel fits its text instead of leaving dead space
  // under a short line or clipping a long one.
  const paymentLines = wrap(paymentText, body, 9.5, contentWidth - 28);
  const panelHeight = 30 + paymentLines.length * 12;
  page.drawRectangle({
    x: MARGIN, y: y + 14 - panelHeight, width: contentWidth, height: panelHeight,
    color: isInvoice && paid ? rgb(0.93, 0.97, 0.95) : rgb(0.98, 0.94, 0.96),
    borderColor: isInvoice && paid ? rgb(0.72, 0.87, 0.8) : rgb(0.92, 0.8, 0.87),
    borderWidth: 0.75,
  });
  y -= 4;
  text(isInvoice ? (paid ? "PAYMENT RECEIVED" : "PAYMENT") : "PAYMENT", {
    font: bold, size: 8, color: isInvoice && paid ? PAID : PINK, x: MARGIN + 14,
  });
  y -= 15;
  for (const detail of paymentLines) {
    text(detail, { size: 9.5, color: INK, x: MARGIN + 14 });
    y -= 12;
  }

  y -= 32;
  text("PICKUP", { font: bold, size: 8, color: MUTED });
  y -= 15;
  const pickupDate = formatDateValue(record.pickupDate) || formatDateValue(record.wantedDate) || "To be arranged";
  const pickupTime = formatTimeValue(record.pickupTime) || "To be arranged";
  text(`${pickupDate}   ·   ${pickupTime}`, { font: bold, size: 11 });
  y -= 14;
  for (const detail of wrap(record.pickupLocation || "The owner will confirm the pickup location with you.", body, 9.5, contentWidth)) {
    text(detail, { size: 9.5, color: MUTED });
    y -= 12;
  }

  // Footer pinned to the bottom rather than flowing with the content.
  page.drawLine({
    start: { x: MARGIN, y: MARGIN + 34 }, end: { x: PAGE.width - MARGIN, y: MARGIN + 34 },
    thickness: 0.75, color: RULE,
  });
  page.drawText(`Questions? Reply to your email or call ${SITE.phone}. Please include ${record.orderNumber}.`,
    { x: MARGIN, y: MARGIN + 20, size: 9, font: body, color: MUTED });
  page.drawText(`${SITE.name}  ·  Pickup only  ·  No online payment is collected on the website.`,
    { x: MARGIN, y: MARGIN + 8, size: 8, font: body, color: MUTED });

  return Buffer.from(await pdf.save());
}

export function documentFilename(record, documentKind) {
  const reference = String(record?.orderNumber || "order").replace(/[^A-Za-z0-9-]/g, "");
  return documentKind === "invoice"
    ? `BonBons-Invoice-${reference}.pdf`
    : `BonBons-Confirmation-${reference}.pdf`;
}
