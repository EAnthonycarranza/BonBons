import "server-only";
import nodemailer from "nodemailer";
import path from "node:path";
import { buildOrderEmail, EMAIL_LOGO_CID, EMAIL_PAYMENT_CIDS, EMAIL_SOCIAL_CIDS } from "./email-template.js";
import { buildOrderDocument, documentFilename } from "./order-pdf.js";
import { SITE } from "./sample-data.js";

export { buildOrderEmail } from "./email-template.js";

let transporter;

function emailSettings() {
  return {
    user: String(process.env.GMAIL_USER || "").trim(),
    password: String(process.env.GMAIL_APP_PASSWORD || "").replace(/\s/g, ""),
    fromName: String(process.env.GMAIL_FROM_NAME || "Bon Bon's Sweets & More").replace(/[\r\n]/g, " ").trim(),
  };
}

export function hasEmailConfiguration() {
  const settings = emailSettings();
  return Boolean(settings.user && settings.password);
}

function getTransporter() {
  if (!hasEmailConfiguration()) throw new Error("Gmail is not configured.");
  if (!transporter) {
    const settings = emailSettings();
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: settings.user, pass: settings.password },
      pool: true, maxConnections: 2, maxMessages: 50,
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, dnsTimeout: 8000,
      disableUrlAccess: true,
    });
  }
  return transporter;
}

export async function verifyEmailConnection() {
  await getTransporter().verify();
  return { sender: emailSettings().user };
}

export function emailLogoAttachment() {
  return {
    filename: "bonbons-logo.png",
    path: path.join(process.cwd(), "assets", "logo-embed-tp.png"),
    cid: EMAIL_LOGO_CID,
    contentType: "image/png",
    contentDisposition: "inline",
  };
}

// The payment marks the message references by CID. Attached to every email so
// the panel never renders with three broken images, whichever email it is.
export function emailPaymentAttachments() {
  return Object.entries(EMAIL_PAYMENT_CIDS).map(([name, cid]) => ({
    filename: `${name}.png`,
    path: path.join(process.cwd(), "assets", `email-${name}.png`),
    cid,
    contentType: "image/png",
    contentDisposition: "inline",
  }));
}

export function emailSocialAttachments() {
  return Object.entries(EMAIL_SOCIAL_CIDS).map(([platform, cid]) => ({
    filename: `${platform}.png`,
    path: path.join(process.cwd(), "assets", `email-${platform}.png`),
    cid,
    contentType: "image/png",
    contentDisposition: "inline",
  }));
}

/**
 * A confirmation and a paid invoice both carry a PDF the customer can keep.
 *
 * Building it can fail (a corrupt logo, an odd record), and that must not stop
 * the email: the customer is better off with the message and no attachment
 * than with nothing at all, so a failure is logged and the send continues.
 */
async function orderDocumentAttachment({ record, kind, emailType }) {
  const documentKind = emailType === "paid_invoice" ? "invoice"
    : emailType === "confirmation" ? "confirmation" : null;
  if (!documentKind) return null;
  try {
    const content = await buildOrderDocument({ record, kind, documentKind });
    return {
      filename: documentFilename(record, documentKind),
      content,
      contentType: "application/pdf",
    };
  } catch (error) {
    console.error(`Could not build the ${documentKind} PDF:`, error.message);
    return null;
  }
}

export async function sendOrderEmail(options) {
  const settings = emailSettings();
  const message = buildOrderEmail(options);
  const document = await orderDocumentAttachment(options);
  const result = await getTransporter().sendMail({
    from: { name: settings.fromName, address: settings.user },
    replyTo: SITE.email,
    to: { address: message.recipient },
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [emailLogoAttachment(), ...emailSocialAttachments(), ...emailPaymentAttachments(), ...(document ? [document] : [])],
    headers: options.emailType === "request_received" ? { "Auto-Submitted": "auto-generated" } : {},
  });
  if (!result.accepted?.length) throw new Error("Gmail did not accept the recipient.");
  return { ...message, messageId: result.messageId || "", documentAttached: Boolean(document) };
}
