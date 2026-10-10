import { parseDateValue } from "./date-values.js";
import { isEmail } from "./format.js";

// No 0/O or 1/I/L, so a code copied from a printed card can only be read one way.
export const COUPON_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const COUPON_CODE_LENGTH = 6;

export function generateCouponCodes(count, randomInt) {
  const codes = new Set();
  while (codes.size < count) {
    codes.add(Array.from({ length: COUPON_CODE_LENGTH }, () => COUPON_CODE_ALPHABET[randomInt(COUPON_CODE_ALPHABET.length)]).join(""));
  }
  return [...codes];
}

export function normalizeCouponCode(value) {
  const code = String(value ?? "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{2,30}[A-Z0-9]$/.test(code)) {
    throw new Error("Use a coupon code with 4–32 letters, numbers, or hyphens.");
  }
  return code;
}

function amount(value, name, minimum, maximum) {
  if (value === "" || value === null || typeof value === "boolean") throw new Error(`${name} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum || Math.abs(number * 100 - Math.round(number * 100)) > 0.000001) {
    throw new Error(`${name} must be between $${minimum} and $${maximum}, with at most two decimal places.`);
  }
  return Math.round(number * 100) / 100;
}

export function validateCouponBatch(input = {}) {
  const name = String(input.name || "").trim();
  if (!name || name.length > 80) throw new Error("Give these coupons a name of up to 80 characters.");
  const discountAmount = amount(input.discountAmount, "Discount", 0.01, 500);
  const minimumSubtotal = amount(input.minimumSubtotal ?? 0, "Minimum order", 0, 100000);
  const quantity = Number(input.quantity ?? 1);
  const maxRedemptions = Number(input.maxRedemptions ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) throw new Error("Generate between 1 and 200 codes at a time.");
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 1000000) throw new Error("Set a redemption limit between 1 and 1,000,000 per code.");
  const code = input.code ? normalizeCouponCode(input.code) : "";
  if (code && quantity !== 1) throw new Error("A custom code can only be used when generating one coupon.");
  const expiresOn = String(input.expiresOn || "");
  if (expiresOn && !parseDateValue(expiresOn)) throw new Error("Choose a valid expiration date.");
  return { name, discountAmount, minimumSubtotal, quantity, maxRedemptions, code, expiresOn };
}

export function toCoupon(row) {
  return {
    id: String(row.id), code: row.code, name: row.name,
    discountAmount: Number(row.discount_amount), minimumSubtotal: Number(row.minimum_subtotal),
    maxRedemptions: Number(row.max_redemptions), redemptionCount: Number(row.redemption_count),
    expiresOn: row.expires_on || "", active: row.active, createdAt: row.created_at,
  };
}

export function validatePhysicalRedemption(input = {}) {
  const code = normalizeCouponCode(input.code);
  const customerEmail = String(input.customerEmail || "").trim().toLowerCase();
  if (!isEmail(customerEmail) || customerEmail.length > 254) throw new Error("Enter a valid customer email to check the promotion limit.");
  const customerName = String(input.customerName || "").trim();
  if (customerName.length > 120) throw new Error("Use a customer name of up to 120 characters.");
  const subtotal = amount(input.subtotal, "Purchase subtotal", 0.01, 100000);
  const requestId = String(input.requestId || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) throw new Error("Please refresh the form and try again.");
  return { code, customer_email: customerEmail, customer_name: customerName, subtotal, request_id: requestId };
}

export function couponStatus(coupon, today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago" }).format(new Date())) {
  if (!coupon.active) return "Disabled";
  if (coupon.expiresOn && coupon.expiresOn < today) return "Expired";
  if (coupon.redemptionCount >= coupon.maxRedemptions) return "Redeemed";
  return "Available";
}
