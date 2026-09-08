import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { PAYMENT_STATUS_VALUES, QUOTE_STATUS_VALUES } from "@/lib/order-tracking";
import { callBonbonsAdmin, callSupabaseData, hasSupabaseDatabase, toQuote } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasSupabaseDatabase()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.status !== undefined) {
    if (!QUOTE_STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid request status." }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.paymentStatus !== undefined) {
    if (!PAYMENT_STATUS_VALUES.includes(body.paymentStatus)) {
      return NextResponse.json({ error: "Invalid payment status." }, { status: 400 });
    }
    update.payment_status = body.paymentStatus;
  }
  if (body.adminNotes !== undefined) {
    update.admin_notes = String(body.adminNotes || "").trim().slice(0, 4000);
  }
  if (body.confirmedTotal !== undefined) {
    const value = body.confirmedTotal === "" || body.confirmedTotal === null
      ? null
      : Number(body.confirmedTotal);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      return NextResponse.json({ error: "Confirmed total must be a valid amount." }, { status: 400 });
    }
    update.confirmed_total = value;
  }
  if (body.pickupDate !== undefined) {
    if (body.pickupDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(body.pickupDate))) {
      return NextResponse.json({ error: "Pickup date is invalid." }, { status: 400 });
    }
    update.pickup_date = body.pickupDate || null;
  }
  if (body.pickupTime !== undefined) {
    if (body.pickupTime && !/^\d{2}:\d{2}$/.test(String(body.pickupTime))) {
      return NextResponse.json({ error: "Pickup time is invalid." }, { status: 400 });
    }
    update.pickup_time = body.pickupTime || null;
  }
  if (body.pickupLocation !== undefined) {
    update.pickup_location = String(body.pickupLocation || "").trim().slice(0, 1000);
  }
  if (body.paymentInstructions !== undefined) {
    update.payment_instructions = String(body.paymentInstructions || "").trim().slice(0, 2000);
  }

  try {
    const { data } = await callSupabaseData("update_quote", { id, update });
    return NextResponse.json({ ok: true, quote: toQuote(data) });
  } catch (err) {
    if (err.status === 404) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }
    console.error("Request update failed:", err.message);
    return NextResponse.json({ error: "Could not update the request." }, { status: 500 });
  }
}

/**
 * Permanently delete a custom request.
 *
 * Mirrors the order route: no soft-delete, because these rows hold a
 * customer's name, email and phone. Deletion is allowed at any stage — a
 * booked or closed request is exactly the kind the owner may be asked to
 * remove.
 */
export async function DELETE(request, { params }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean));
  if (process.env.NODE_ENV === "development") {
    const port = new URL(request.url).port;
    for (const host of ["localhost", "127.0.0.1"]) allowed.add(`http://${host}${port ? `:${port}` : ""}`);
  }
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowed.has(origin))) {
    return NextResponse.json({ error: "This request must come from your admin dashboard." }, { status: 403 });
  }
  if (!hasSupabaseDatabase()) {
    return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  try {
    await callBonbonsAdmin("delete_quote", { id });
    return NextResponse.json({ ok: true, id });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Could not delete this request." },
      { status: error.status || 500 }
    );
  }
}
