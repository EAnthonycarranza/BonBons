import "server-only";
import nodemailer from "nodemailer";
import path from "node:path";
import { buildOrderEmail, EMAIL_LOGO_CID, EMAIL_SOCIAL_CIDS } from "./email-template.js";
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

export function emailSocialAttachments() {
  return Object.entries(EMAIL_SOCIAL_CIDS).map(([platform, cid]) => ({
    filename: `${platform}.png`,
    path: path.join(process.cwd(), "assets", `email-${platform}.png`),
    cid,
    contentType: "image/png",
    contentDisposition: "inline",
  }));
}

export async function sendOrderEmail(options) {
  const settings = emailSettings();
  const message = buildOrderEmail(options);
  const result = await getTransporter().sendMail({
    from: { name: settings.fromName, address: settings.user },
    replyTo: SITE.email,
    to: { address: message.recipient },
    subject: message.subject,
    text: message.text,
    html: message.html,
    attachments: [emailLogoAttachment(), ...emailSocialAttachments()],
    headers: options.emailType === "request_received" ? { "Auto-Submitted": "auto-generated" } : {},
  });
  if (!result.accepted?.length) throw new Error("Gmail did not accept the recipient.");
  return { ...message, messageId: result.messageId || "" };
}
