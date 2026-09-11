import { NextResponse } from "next/server";
import { orderTokenMatches, siteOrigin } from "@/lib/order-links";
import { CASH_AT_PICKUP, isPaidStatus } from "@/lib/order-tracking";
import { callSupabaseData, hasSupabaseDatabase } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

/**
 * A customer switching between "cash at pickup" and "pay online". No login:
 * the link is authorised by the HMAC token from lib/order-links.
 *
 * GET is what an email link can do, so it applies the change and redirects to
 * a page that explains what happened. POST is for buttons on the site.
 *
 * Money is never touched here. A paid order is left exactly as it is.
 */
async function applyChoice(id, token, choice) {
  if (!/^\d+$/.test(String(id))) return { outcome: "invalid" };
  if (!["cash", "online"].includes(choice)) return { outcome: "invalid" };
  if (!orderTokenMatches(id, token)) return { outcome: "invalid" };
  if (!hasSupabaseDatabase()) return { outcome: "unavailable" };

  let order;
  try {
    ({ data: order } = await callSupabaseData("get_order", { id: String(id) }));
  } catch (err) {
    return { outcome: err.status === 404 ? "invalid" : "unavailable" };
  }
  if (!order) return { outcome: "invalid" };
  if (isPaidStatus(order.payment_status)) {
    return { outcome: "already_paid", orderNumber: order.order_number };
  }

  const next = choice === "cash" ? CASH_AT_PICKUP : "not_arranged";
  if (order.payment_status === next) {
    return { outcome: choice, orderNumber: order.order_number, changed: false };
  }
  try {
    await callSupabaseData("update_order", { id: String(id), update: { payment_status: next } });
  } catch (err) {
    console.error("Payment choice update failed:", err.message);
    return { outcome: "unavailable", orderNumber: order.order_number };
  }
  return { outcome: choice, orderNumber: order.order_number, changed: true };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const url = new URL(request.url);
  const result = await applyChoice(id, url.searchParams.get("t"), url.searchParams.get("choice"));
  const dest = new URL("/order/payment-choice", siteOrigin());
  dest.searchParams.set("outcome", result.outcome);
  if (result.orderNumber) dest.searchParams.set("order", result.orderNumber);
  return NextResponse.redirect(dest, 303);
}

export async function POST(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await applyChoice(id, body.token, body.choice);
  const status = result.outcome === "invalid" ? 404 : result.outcome === "unavailable" ? 503 : 200;
  return NextResponse.json(result, { status });
}
