import { money } from "./format.js";
import { ORDER_STATUSES, QUOTE_STATUSES } from "./order-tracking.js";
import { SITE } from "./sample-data.js";

export const EMAIL_LOGO_CID = "bonbons-logo@codingcarranza.com";
export const EMAIL_SOCIAL_CIDS = {
  instagram: "bonbons-instagram@codingcarranza.com",
  facebook: "bonbons-facebook@codingcarranza.com",
  tiktok: "bonbons-tiktok@codingcarranza.com",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "To be arranged";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "To be arranged";
  const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return String(value);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" })
    .format(new Date(2000, 0, 1, hours, minutes));
}

function details(record, kind) {
  if (kind === "orders") return (record.items || []).map((item) => ({
    name: `${item.qty} × ${item.name}`,
    description: item.description || "",
    amount: money(Number(item.price || 0) * Number(item.qty || 1)),
  }));
  return [
    ["Occasion", record.occasion], ["Requested quantity", record.guests],
    ["Cake pops", record.interests?.join(", ")], ["Colors / theme", record.colors],
  ].filter(([, value]) => value).map(([name, description]) => ({ name, description }));
}

export function buildOrderEmail({ record, kind, emailType, personalMessage = "", delayNotice = false }) {
  if (!["request_received", "confirmation", "status_update", "paid_invoice"].includes(emailType)) throw new Error("Invalid email type.");
  const isReceipt = emailType === "request_received";
  const isConfirmation = emailType === "confirmation";
  const isInvoice = emailType === "paid_invoice";
  if (isReceipt && (kind !== "orders" || record.orderNumber)) throw new Error("Receipts are for unconfirmed pickup requests only.");
  if (!isReceipt && !record.orderNumber) throw new Error("An order number is required before sending a confirmation, update, or invoice.");
  if (isInvoice && !["paid_cash", "paid_direct"].includes(record.paymentStatus)) {
    throw new Error("A paid invoice can only be sent once the order is marked as paid.");
  }

  const customer = kind === "orders" ? record.customer || {} : record;
  const statuses = kind === "orders" ? ORDER_STATUSES : QUOTE_STATUSES;
  const stage = statuses.find((option) => option.value === record.status)?.label || "Order update";
  const hasConfirmedTotal = !isReceipt && record.confirmedTotal != null;
  const total = hasConfirmedTotal ? record.confirmedTotal : kind === "orders" ? record.subtotal : null;
  const totalLabel = hasConfirmedTotal ? "Confirmed total" : "Estimated total";
  const subject = isReceipt ? "We received your pickup request — Bon Bon's Sweets & More"
    : isInvoice ? `Invoice for order ${record.orderNumber} — paid in full`
    : isConfirmation ? `Order ${record.orderNumber} confirmed — Bon Bon's Sweets & More`
      : delayNotice === true && emailType === "status_update"
        ? `Order ${record.orderNumber}: your pickup date has changed`
        : `Order ${record.orderNumber} update: ${stage}`;
  const headline = isReceipt ? "Your request is in."
    : isInvoice ? "Thank you — you're all paid."
    : isConfirmation ? "Your order is confirmed."
      : delayNotice === true && emailType === "status_update"
        ? "Your pickup date has changed." : "An update on your order.";
  const intro = isReceipt
    ? "Thanks for choosing Bon Bon's! We've saved your cake-pop request. The owner will review it and contact you to confirm availability, your final total, and pickup details."
    : isInvoice
      ? "We've received your payment in full — thank you! Your paid invoice is attached as a PDF for your records. Nothing further is due."
    : isConfirmation
      ? "Your cake-pop order is confirmed, and a PDF copy is attached for your records. Here's everything you need for pickup. Keep your order number handy if you have any questions."
      : delayNotice === true && emailType === "status_update"
        ? "We're sorry — your order needs a little more time, so your pickup has been rescheduled. Everything else about your order stays the same."
        : `Your order is now marked “${stage}.” Here are the latest details from Bon Bon's.`;
  const status = isReceipt ? "Awaiting owner confirmation" : stage;
  const pickupDate = formatDate(isReceipt ? record.wantedDate : record.pickupDate || record.wantedDate || record.eventDate);
  const pickupTime = isReceipt ? "To be arranged" : formatTime(record.pickupTime);
  const pickupLocation = !isReceipt && record.pickupLocation ? record.pickupLocation : "The owner will confirm the pickup location with you.";
  const pickupMapUrl = !isReceipt && record.pickupLocation
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.pickupLocation)}` : "";
  const paid = ["paid_cash", "paid_direct"].includes(record.paymentStatus);
  const payment = isReceipt
    ? "No payment has been collected. Please wait for the owner to confirm your order and payment instructions before sending any payment."
    : paid ? "Payment is recorded. Thank you!"
      : record.paymentInstructions || SITE.paymentInstructions;
  const canPay = !isReceipt && !paid && hasConfirmedTotal && Number(total) > 0 &&
    ["confirmed", "booked", "preparing", "ready"].includes(record.status);
  // A delay notice belongs on an update, never on a receipt or a first
  // confirmation. With a new pickup date saved we state it; without one we ask
  // the customer to call so a date can be agreed.
  const isDelay = emailType === "status_update" && delayNotice === true;
  const hasNewPickup = Boolean(record.pickupDate);
  const message = String(personalMessage || "").trim();
  const rows = details(record, kind);
  const labelStyle = "font-size:11px;line-height:16px;letter-spacing:1.1px;text-transform:uppercase;font-weight:700;color:#706376;";
  const preheader = isReceipt
    ? "Your request is saved. We'll be in touch to confirm the details. No payment is due yet."
    : isDelay
      ? `${record.orderNumber} · Your pickup date has changed · Details inside.`
      : isInvoice
        ? `${record.orderNumber} · Paid in full · Your invoice is attached.`
        : `${record.orderNumber} · ${status} · Pickup details inside.`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0;mso-table-rspace:0} table{border-collapse:collapse}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}
    @media only screen and (max-width:620px){.email-outer{padding:16px 8px!important}.email-content{padding:26px 22px!important}.email-headline{font-size:29px!important;line-height:35px!important}.email-column{display:block!important;width:100%!important;padding:0 0 18px!important}}
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background:#100b16;font-family:Arial,Helvetica,sans-serif;color:#2b2032;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#100b16">
    <tr><td class="email-outer" align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#1b1025;border-radius:16px;border-collapse:separate;border-spacing:0;">
        <tr><td align="center" bgcolor="#1b1025" style="padding:24px 24px 22px;border-top:4px solid #ff2e9a;border-radius:16px 16px 0 0;">
          <img src="cid:${EMAIL_LOGO_CID}" width="176" height="176" alt="Bon Bon's Sweets &amp; More" style="display:block;width:176px;height:176px;margin:0 auto;">
          <p style="margin:8px 0 0;color:#e8dcea;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;">HANDMADE CAKE POPS &nbsp;·&nbsp; PICKUP ONLY</p>
        </td></tr>
        <tr><td class="email-content" bgcolor="#fffaf5" style="padding:34px 36px 30px;">
          <p style="margin:0 0 12px;font-size:11px;line-height:17px;letter-spacing:1.5px;font-weight:700;color:#b31665;text-transform:uppercase;">${isReceipt ? "Pickup request received" : isInvoice ? "Paid invoice" : isConfirmation ? "Order confirmation" : "Order update"}</p>
          <h1 class="email-headline" style="margin:0 0 22px;font-size:35px;line-height:41px;letter-spacing:-1px;color:#24172c;">${escapeHtml(headline)}</h1>
          <p style="margin:0 0 8px;font-size:16px;line-height:25px;color:#2b2032;">Hi ${escapeHtml(customer.name || "there")},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:25px;color:#594b60;">${escapeHtml(intro)}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f8eaf2" style="border:1px solid #ebcbdc;">
            <tr><td style="padding:18px 20px;">
              <p style="${labelStyle}margin:0 0 5px;color:#a02061;">${isReceipt ? "Request status" : "Your order number"}</p>
              <p style="margin:0;color:#35213e;font-size:${isReceipt ? "18" : "26"}px;line-height:30px;font-weight:700;">${escapeHtml(isReceipt ? status : record.orderNumber)}</p>
              <p style="margin:5px 0 0;font-size:13px;line-height:21px;color:#66506c;">${isReceipt ? "This is a request, not a confirmed order. Your order number will be assigned after confirmation." : escapeHtml(status)}</p>
            </td></tr>
          </table>

          <h2 style="margin:28px 0 12px;font-size:18px;line-height:25px;color:#2b2032;">${isReceipt ? "What you requested" : "Your cake pops"}</h2>
          <table width="100%" cellpadding="0" cellspacing="0" aria-label="Requested items" style="font-size:14px;line-height:22px;">
            <thead><tr><th scope="col" align="left" style="${labelStyle}padding-bottom:8px;border-bottom:1px solid #e8dce5;">Item / quantity</th><th scope="col" align="right" style="${labelStyle}padding-bottom:8px;border-bottom:1px solid #e8dce5;">Amount</th></tr></thead>
            <tbody>${rows.map((row) => `<tr><td style="padding:14px 12px 14px 0;border-bottom:1px solid #e8dce5;vertical-align:top;color:#35273c;"><strong>${escapeHtml(row.name)}</strong>${row.description ? `<div style="font-size:12px;line-height:19px;color:#706376;margin-top:3px;">${escapeHtml(row.description)}</div>` : ""}</td><td align="right" style="padding:14px 0;border-bottom:1px solid #e8dce5;vertical-align:top;white-space:nowrap;color:#35273c;font-weight:700;">${escapeHtml(row.amount || "—")}</td></tr>`).join("")}
            ${total != null ? `<tr><td style="padding:18px 0 0;font-weight:700;color:#35273c;">${totalLabel}</td><td align="right" style="padding:18px 0 0;font-size:24px;line-height:29px;font-weight:700;color:#a91963;">${escapeHtml(money(total))}</td></tr>` : ""}</tbody>
          </table>
          ${!hasConfirmedTotal ? `<p style="margin:8px 0 0;font-size:12px;line-height:19px;color:#706376;">The owner confirms the final total before your order is accepted.</p>` : ""}

          ${isDelay ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#fff4e6" style="margin-top:26px;border:1px solid #f0c48a;"><tr><td style="padding:18px 20px;border-left:4px solid #e07b16;">
            <p style="${labelStyle}margin:0 0 7px;color:#a85a05;">Your pickup has been rescheduled</p>
            ${hasNewPickup
              ? `<p style="margin:0 0 6px;font-size:16px;line-height:24px;font-weight:700;color:#35273c;">New pickup: ${escapeHtml(pickupDate)}${pickupTime && pickupTime !== "To be arranged" ? ` at ${escapeHtml(pickupTime)}` : ""}</p>
                 <p style="margin:0;font-size:13px;line-height:22px;color:#66506c;">If that new date doesn&rsquo;t work for you, call or text <a href="${SITE.phoneHref}" style="color:#a91963;font-weight:700;text-decoration:underline;">${escapeHtml(SITE.phone)}</a> and we&rsquo;ll find a time that does.</p>`
              : `<p style="margin:0 0 6px;font-size:15px;line-height:24px;font-weight:700;color:#35273c;">We need to agree a new pickup date with you.</p>
                 <p style="margin:0;font-size:13px;line-height:22px;color:#66506c;">Please call or text <a href="${SITE.phoneHref}" style="color:#a91963;font-weight:700;text-decoration:underline;">${escapeHtml(SITE.phone)}</a> so we can arrange a date that suits you.</p>`}
          </td></tr></table>` : ""}

          <h2 style="margin:28px 0 14px;font-size:18px;line-height:25px;color:#2b2032;">${isReceipt ? "Your pickup request" : "Pickup details"}</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td class="email-column" width="60%" valign="top" style="padding:0 16px 18px 0;">
              <p style="${labelStyle}margin:0 0 5px;">${isReceipt ? "Requested date" : "Pickup date"}</p>
              <p style="margin:0;font-size:14px;line-height:22px;font-weight:700;color:#35273c;">${escapeHtml(pickupDate)}</p>
            </td><td class="email-column" width="40%" valign="top" style="padding:0 0 18px;">
              <p style="${labelStyle}margin:0 0 5px;">Pickup time</p>
              <p style="margin:0;font-size:14px;line-height:22px;font-weight:700;color:#35273c;">${escapeHtml(pickupTime)}</p>
            </td></tr>
            <tr><td colspan="2" style="padding-bottom:22px;">
              <p style="${labelStyle}margin:0 0 5px;">Pickup location</p>
              <p style="margin:0;font-size:14px;line-height:23px;color:#594b60;">${escapeHtml(pickupLocation)}</p>
              ${pickupMapUrl ? `<p style="margin:10px 0 0;"><a href="${escapeHtml(pickupMapUrl)}" style="color:#a91963;font-size:14px;line-height:24px;font-weight:700;text-decoration:underline;">Open pickup location in Google Maps &rarr;</a></p>` : ""}
            </td></tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f0eaf2"><tr><td style="padding:16px 18px;border-left:3px solid #a882b7;">
            <p style="${labelStyle}margin:0 0 6px;">${isReceipt ? "No payment needed yet" : paid ? "Payment received" : "Payment"}</p>
            <p style="margin:0;color:#594b60;font-size:13px;line-height:22px;">${escapeHtml(payment)}</p>
            ${canPay ? `<p style="margin:15px 0 0;"><a href="${escapeHtml(SITE.paymentUrl)}" style="display:inline-block;padding:12px 20px;border-radius:5px;background:#b31665;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Open payment options &rarr;</a></p><p style="margin:10px 0 0;color:#594b60;font-size:12px;line-height:20px;">Venmo, Cash App, or Zelle. Include order ${escapeHtml(record.orderNumber)}. Please confirm payment with Bonnie.</p>` : ""}
          </td></tr></table>
          ${message ? `<h2 style="margin:24px 0 8px;font-size:16px;color:#35273c;">A note from Bon Bon's</h2><p style="margin:0;font-size:14px;line-height:24px;color:#594b60;">${escapeHtml(message).replace(/\n/g, "<br>")}</p>` : ""}
          ${isInvoice || isConfirmation ? `<p style="margin:22px 0 0;padding:13px 16px;background:#f4f0f6;border-left:3px solid #a882b7;font-size:13px;line-height:21px;color:#594b60;"><strong style="color:#35273c;">${isInvoice ? "Your paid invoice" : "Your order confirmation"} is attached as a PDF.</strong> Save it for your records${isInvoice ? "" : " and bring your order number to pickup"}.</p>` : ""}
          <p style="margin:26px 0 0;padding-top:22px;border-top:1px solid #e8dce5;font-size:14px;line-height:23px;color:#594b60;">Need to change something? <strong style="color:#35273c;">Just reply to this email.</strong>${isReceipt ? " Your message will reach the owner." : ` Please include order ${escapeHtml(record.orderNumber)}.`}</p>
          <p style="margin:18px 0 0;font-size:14px;line-height:23px;color:#35273c;">Thanks for supporting Bon Bon's,<br><strong>Bon Bon's Sweets &amp; More</strong><br><a href="mailto:${SITE.email}" style="color:#a91963;">${SITE.email}</a><br><a href="${SITE.phoneHref}" style="color:#a91963;">${SITE.phone}</a></p>
        </td></tr>
        <tr><td align="center" bgcolor="#1b1025" style="padding:22px 24px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 12px;color:#eee1f2;font-size:13px;line-height:20px;font-weight:700;">A little sweetness, made for you.</p>
          <table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>
            <td align="center" width="82"><a href="https://www.instagram.com/bonbonssweets.satx/" aria-label="Follow Bon Bon's on Instagram" style="display:inline-block;color:#ff9bcc;text-decoration:none;"><img src="cid:${EMAIL_SOCIAL_CIDS.instagram}" width="38" height="38" alt="Instagram" style="display:block;width:38px;height:38px;margin:0 auto 6px;"><span style="font-size:10px;line-height:15px;color:#ff9bcc;">Instagram</span></a></td>
            <td align="center" width="82"><a href="https://www.facebook.com/bonbonssweets.sa" aria-label="Follow Bon Bon's on Facebook" style="display:inline-block;color:#ff9bcc;text-decoration:none;"><img src="cid:${EMAIL_SOCIAL_CIDS.facebook}" width="38" height="38" alt="Facebook" style="display:block;width:38px;height:38px;margin:0 auto 6px;"><span style="font-size:10px;line-height:15px;color:#ff9bcc;">Facebook</span></a></td>
            <td align="center" width="82"><a href="https://www.tiktok.com/@bonbonssweetssa" aria-label="Follow Bon Bon's on TikTok" style="display:inline-block;color:#ff9bcc;text-decoration:none;"><img src="cid:${EMAIL_SOCIAL_CIDS.tiktok}" width="38" height="38" alt="TikTok" style="display:block;width:38px;height:38px;margin:0 auto 6px;"><span style="font-size:10px;line-height:15px;color:#ff9bcc;">TikTok</span></a></td>
          </tr></table>
          <p style="margin:12px 0 0;color:#c7b6d0;font-size:11px;line-height:18px;">${isReceipt ? "Automated receipt for the pickup request you submitted." : "An update about your Bon Bon's order."}<br>Pickup only &nbsp;·&nbsp; No online payment collected</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "Bon Bon's Sweets & More", headline, "", `Hi ${customer.name || "there"},`, intro, "",
    `Status: ${status}`,
    isReceipt ? "This is a request, not a confirmed order. Your order number will be assigned after confirmation." : `Order number: ${record.orderNumber}`,
    "", ...rows.map((row) => `${row.name}${row.amount ? ` — ${row.amount}` : ""}${row.description ? `\n  ${row.description}` : ""}`),
    total != null ? `${totalLabel}: ${money(total)}` : "", "",
    isDelay ? (hasNewPickup
      ? `YOUR PICKUP HAS BEEN RESCHEDULED\nNew pickup: ${pickupDate}${pickupTime && pickupTime !== "To be arranged" ? ` at ${pickupTime}` : ""}\nIf that new date doesn't work for you, call or text ${SITE.phone} and we'll find a time that does.\n`
      : `YOUR PICKUP HAS BEEN RESCHEDULED\nWe need to agree a new pickup date with you. Please call or text ${SITE.phone} so we can arrange a date that suits you.\n`) : "",
    `${isReceipt ? "Requested date" : "Pickup date"}: ${pickupDate}`, `Pickup time: ${pickupTime}`,
    `Pickup location: ${pickupLocation}`, pickupMapUrl ? `Google Maps: ${pickupMapUrl}` : "",
    "", `Payment: ${payment}`,
    isInvoice ? "Your paid invoice is attached to this email as a PDF." : isConfirmation ? "Your order confirmation is attached to this email as a PDF." : "",
    message ? `\nA note from Bon Bon's:\n${message}` : "", "",
    canPay ? `Payment options: ${SITE.paymentUrl}\nInclude order ${record.orderNumber}.` : "",
    "Questions or changes? Reply to this email to reach the owner.",
    `${SITE.email} · ${SITE.phone}`,
    "Pickup only · No online payment collected",
  ].join("\n");

  return { subject, html, text, recipient: customer.email };
}
