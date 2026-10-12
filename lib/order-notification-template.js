import { money } from "./format.js";
import { pickupDateLabel, pickupTimeLabel } from "./pickup-schedule.js";
import { EMAIL_LOGO_CID } from "./email-template.js";
export const ORDER_NOTIFICATION_RECIPIENT = "info@bonbonssweets.com";
const escape = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
export function buildIncomingOrderEmail(
  record,
  siteUrl = "https://www.bonbonssweets.com",
) {
  const customer = record.customer || {},
    id = String(record.id || record._id || "");
  if (!/^\d+$/.test(id))
    throw new Error("A saved order is required before notifying the shop.");
  const subject = `Incoming order request #${id} — ${String(customer.name || "Customer").replace(/[\r\n]/g, " ")}`;
  const pickup = `${pickupDateLabel(record.wantedDate)} at ${record.wantedTime ? pickupTimeLabel(record.wantedTime) : "a time to be arranged"} (San Antonio time)`;
  const requestType =
    record.pickupRequestType === "custom"
      ? "Alternate pickup requested — contact the customer to discuss accommodation."
      : "Regular pickup requested — availability still needs confirmation.";
  const payment =
    record.paymentStatus === "cash_at_pickup"
      ? "Cash at pickup requested; no payment received."
      : "Online payment after confirmation; no payment received.";
  const items = (record.items || []).map((item) => ({
    label: `${item.qty} × ${item.name}`,
    description: item.description || item.desc || "",
    amount: money(Number(item.price) * Number(item.qty)),
  }));
  const adminUrl = new URL("/admin", siteUrl).href;
  const text = [
    "Bon Bon's Sweets & More",
    `Incoming order request #${id}`,
    requestType,
    "",
    `Customer: ${customer.name}`,
    `Email: ${customer.email}`,
    `Phone: ${customer.phone}`,
    `Requested pickup: ${pickup}`,
    "",
    ...items.flatMap((item) => [
      `${item.label}: ${item.amount}`,
      item.description,
    ]),
    "",
    `Estimated total: ${money(record.subtotal)}`,
    record.couponCode
      ? `Coupon ${record.couponCode}: ${money(record.discountAmount)} off`
      : "",
    payment,
    record.notes ? `Customer notes: ${record.notes}` : "",
    `Review and confirm: ${adminUrl}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#100b16;font-family:Arial,sans-serif;color:#302335"><table role="presentation" width="100%" style="padding:24px"><tr><td align="center"><table role="presentation" width="100%" style="max-width:600px;background:#fffaf5;border-radius:14px;overflow:hidden"><tr><td style="background:#1b1025;text-align:center;padding:24px;border-top:4px solid #ff2e9a"><img src="cid:${EMAIL_LOGO_CID}" alt="Bon Bon's Sweets &amp; More" width="140" height="140"></td></tr><tr><td style="padding:28px"><p style="font-size:11px;color:#b31665;letter-spacing:1px">INCOMING ORDER REQUEST #${escape(id)}</p><h1 style="font-size:28px;margin:12px 0">A new sweet request.</h1><p style="background:#f2e7ef;padding:14px;line-height:1.6">${escape(requestType)}</p><h2 style="font-size:17px">Customer &amp; pickup</h2><p style="line-height:1.8"><strong>${escape(customer.name)}</strong><br>${escape(customer.email)}<br>${escape(customer.phone)}<br>${escape(pickup)}</p><h2 style="font-size:17px">Requested treats</h2><table width="100%" style="border-collapse:collapse">${items.map((item) => `<tr><td style="padding:12px 0;border-bottom:1px solid #e6d9e4"><strong>${escape(item.label)}</strong><br><span style="font-size:12px;line-height:1.7">${escape(item.description)}</span></td><td style="text-align:right;white-space:nowrap;border-bottom:1px solid #e6d9e4">${escape(item.amount)}</td></tr>`).join("")}</table>${record.couponCode ? `<p>Coupon ${escape(record.couponCode)}: ${escape(money(record.discountAmount))} off</p>` : ""}<p style="font-size:19px"><strong>Estimated total: ${escape(money(record.subtotal))}</strong></p><p style="font-size:13px;line-height:1.7">${escape(payment)}</p>${record.notes ? `<h2 style="font-size:17px">Customer notes</h2><p style="line-height:1.7">${escape(record.notes).replace(/\n/g, "<br>")}</p>` : ""}<p style="margin:24px 0"><a href="${escape(adminUrl)}" style="display:inline-block;padding:13px 18px;border-radius:6px;background:#b31665;color:white;text-decoration:none">Review in the Shop Desk →</a></p><p style="font-size:12px;line-height:1.7">Reply to this email to contact the customer. This is a request awaiting your confirmation.</p></td></tr></table></td></tr></table></body></html>`;
  return {
    recipient: ORDER_NOTIFICATION_RECIPIENT,
    subject,
    text,
    html,
    replyTo: customer.email,
  };
}
