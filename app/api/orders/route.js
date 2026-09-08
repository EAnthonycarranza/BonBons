import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isEmail, isPhone } from "@/lib/format";
import { getProducts } from "@/lib/products";
import { normalizeOrderItems } from "@/lib/order-menu";
import { getFeaturedWeeklyBox, getShopSettings } from "@/lib/weekly-box-data";
import { getCartPricing } from "@/lib/pricing";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { sendPickupReceipt } from "@/lib/pickup-receipt";
import {
  callSupabaseData,
  hasSupabaseDatabase,
  orderToRow,
  toOrder,
} from "@/lib/supabase-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "Your pickup request is empty." }, { status: 400 });
  }
  if (!body.customer?.name || !isEmail(body.customer?.email) || !isPhone(body.customer?.phone)) {
    return NextResponse.json(
      { error: "Name, a valid email, and a phone number are required." },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.wantedDate || ""))) {
    return NextResponse.json({ error: "Please choose a valid pickup date." }, { status: 400 });
  }

  const captcha = await verifyRecaptcha({
    request,
    token: body.recaptchaToken,
    expectedAction: RECAPTCHA_ACTIONS.order,
  });
  if (!captcha.ok) {
    return NextResponse.json(
      { error: captcha.unavailable
        ? "The security check is temporarily unavailable. Please try again shortly."
        : "We could not verify this request. Please complete the reCAPTCHA check again and retry." },
      { status: captcha.unavailable ? 503 : 403 }
    );
  }

  // Rebuild every line from the current menu so the browser cannot alter
  // prices, and re-check availability so a sold-out item cannot slip through.
  const [products, settings, weeklyBox] = await Promise.all([
    getProducts(),
    getShopSettings(),
    getFeaturedWeeklyBox(),
  ]);
  let normalizedItems;
  try {
    normalizedItems = normalizeOrderItems(items, products, {
      fourPackPrice: settings.fourPackPrice,
      weeklyBox,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { subtotal } = getCartPricing(normalizedItems);

  const doc = {
    items: normalizedItems,
    subtotal,
    customer: {
      name: String(body.customer.name).trim(),
      email: String(body.customer.email).trim().toLowerCase(),
      phone: String(body.customer.phone || "").trim(),
    },
    fulfilment: "Pickup",
    wantedDate: String(body.wantedDate || ""),
    notes: String(body.notes || "").trim(),
  };

  if (!hasSupabaseDatabase()) {
    return NextResponse.json(
      { error: "Online requests are temporarily unavailable. Please call or text the owner instead." },
      { status: 503 }
    );
  }

  try {
    const { data } = await callSupabaseData("create_order", { order: orderToRow(doc) });
    const receipt = await sendPickupReceipt(toOrder(data));
    return NextResponse.json({
      ok: true,
      stored: true,
      subtotal,
      orderId: String(data.id),
      receiptEmailSent: receipt.sent,
      message:
        "Your pickup request is saved. " +
        (receipt.sent ? "We've emailed you a receipt; check your inbox or spam folder. "
          : "We couldn't send the email receipt, but your request is safely saved—please don't submit it again. ") +
        "The owner will contact you to confirm the details, " +
        "pickup time, total, and how to pay through Bon Bon’s payment options.",
    });
  } catch (err) {
    console.error("Order save failed:", err.message);
    return NextResponse.json({ error: "Could not save your order." }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasSupabaseDatabase()) return NextResponse.json({ orders: [] });
  try {
    const { data } = await callSupabaseData("list_orders");
    return NextResponse.json({ orders: data.map(toOrder) });
  } catch (err) {
    console.error("Order list failed:", err.message);
    return NextResponse.json({ error: "Could not load orders." }, { status: 503 });
  }
}
