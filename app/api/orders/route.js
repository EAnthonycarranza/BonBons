import { NextResponse } from "next/server";
import { connectToDatabase, hasDatabase } from "@/lib/mongodb";
import Order from "@/lib/models/Order";
import { isAdmin } from "@/lib/auth";
import { isEmail, plain } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (!body.customer?.name || !isEmail(body.customer?.email)) {
    return NextResponse.json({ error: "Name and a valid email are required." }, { status: 400 });
  }

  // Recompute the total server-side; never trust a price sent by the browser.
  const subtotal = items.reduce(
    (n, i) => n + Number(i.price || 0) * Number(i.qty || 1),
    0
  );

  const doc = {
    items: items.map((i) => ({
      key: String(i.key || ""),
      name: String(i.name || ""),
      description: String(i.desc || i.description || ""),
      price: Number(i.price || 0),
      qty: Number(i.qty || 1),
    })),
    subtotal,
    customer: {
      name: String(body.customer.name).trim(),
      email: String(body.customer.email).trim().toLowerCase(),
      phone: String(body.customer.phone || "").trim(),
    },
    fulfilment: body.fulfilment === "Delivery" ? "Delivery" : "Pickup",
    wantedDate: String(body.wantedDate || ""),
    notes: String(body.notes || "").trim(),
  };

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      subtotal,
      message:
        "Preview mode — no database is connected, so this order wasn't saved. " +
        "Payment isn't wired up yet either.",
    });
  }

  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  try {
    const created = await Order.create(doc);
    return NextResponse.json({
      ok: true,
      stored: true,
      subtotal,
      orderId: String(created._id),
      message: "Order received. We'll confirm by email shortly.",
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
  if (!hasDatabase()) return NextResponse.json({ orders: [] });
  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ orders: [] });
  const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ orders: orders.map(plain) });
}
