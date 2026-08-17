import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "bb_admin";

/**
 * Deliberately simple: a single shared password, and a cookie holding an HMAC
 * of it so the password itself never sits in the browser. Good enough to keep
 * the dashboard private; NOT a real user system. If Bon Bon's ever needs
 * multiple staff accounts, swap this for NextAuth or Clerk.
 */
function secret() {
  return process.env.ADMIN_SECRET || "dev-only-insecure-secret";
}

export function adminToken() {
  return crypto
    .createHmac("sha256", secret())
    .update(String(process.env.ADMIN_PASSWORD || ""))
    .digest("hex");
}

export async function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const jar = await cookies();
  const got = jar.get(ADMIN_COOKIE)?.value;
  if (!got) return false;
  const expected = adminToken();
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
