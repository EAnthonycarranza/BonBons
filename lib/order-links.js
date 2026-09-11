import crypto from "crypto";

/**
 * One-click links for customers, used inside emails ("I'll pay cash at
 * pickup"). Email clients can only GET, and the customer has no login, so the
 * link carries an HMAC of the order id signed with the server secret. Nothing
 * is stored: the same id and secret always produce the same token, and a
 * guessed id without the token is useless.
 *
 * Rotating ADMIN_SECRET invalidates every link already sent — acceptable, since
 * the desk can still change the status by hand.
 */
function secret() {
  return process.env.ADMIN_SECRET || "";
}

export function orderActionToken(orderId, key = secret()) {
  if (!key || !orderId) return "";
  return crypto.createHmac("sha256", key).update(`order:${orderId}`).digest("hex").slice(0, 40);
}

export function orderTokenMatches(orderId, token, key = secret()) {
  const expected = orderActionToken(orderId, key);
  if (!expected || !token) return false;
  const a = Buffer.from(String(token));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/**
 * Link a customer can click to switch their payment choice.
 * `choice` is "cash" or "online". Returns "" when no secret is configured, so
 * the template can simply omit the button rather than emit a broken link.
 */
export function paymentChoiceUrl(orderId, choice) {
  const token = orderActionToken(orderId);
  if (!token) return "";
  const params = new URLSearchParams({ t: token, choice });
  return `${siteOrigin()}/api/orders/${orderId}/payment-choice?${params}`;
}
