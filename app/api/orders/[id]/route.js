import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ORDER_STATUS_VALUES, PAYMENT_STATUS_VALUES } from "@/lib/order-tracking";
import { callSupabaseData, hasSupabaseDatabase, toOrder } from "@/lib/supabase-data";

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
    return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const update = {};
  if (body.status !== undefined) {
    if (!ORDER_STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid order status." }, { status: 400 });
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
    const { data } = await callSupabaseData("update_order", { id, update });
    return NextResponse.json({ ok: true, order: toOrder(data) });
  } catch (err) {
    if (err.status === 404) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    console.error("Order update failed:", err.message);
    return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
  }
}
