import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMPORT_ROWS = 500;
const STATUSES = new Set(["pending", "contacted", "confirmed", "preparing", "ready", "collected", "cancelled"]);
const PAYMENTS = new Set(["not_arranged", "instructions_sent", "paid_cash", "paid_direct"]);

/**
 * Bulk-create orders from a spreadsheet the owner uploaded.
 *
 * The browser parses the file and sends rows it has already validated, but
 * nothing here trusts that: every field is re-checked and re-shaped before it
 * reaches the database, exactly as the normal order route does.
 */
export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }

  const incoming = Array.isArray(body?.orders) ? body.orders : [];
  if (!incoming.length) {
    return NextResponse.json({ error: "There were no orders to import." }, { status: 400 });
  }
  if (incoming.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      { error: `Import up to ${MAX_IMPORT_ROWS} orders at a time. This file had ${incoming.length}.` },
      { status: 400 }
    );
  }

  const orders = [];
  for (const [index, row] of incoming.entries()) {
    const name = String(row?.customer_name ?? "").trim();
    const email = String(row?.customer_email ?? "").trim().toLowerCase();
    const wanted = String(row?.wanted_date ?? "").trim();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{4}-\d{2}-\d{2}$/.test(wanted)) {
      return NextResponse.json(
        { error: `Row ${index + 1} is missing a name, a valid email, or a date. Nothing was imported.` },
        { status: 400 }
      );
    }
    const subtotal = Math.max(0, Number(row?.subtotal) || 0);
    const items = Array.isArray(row?.items) && row.items.length ? row.items : null;
    if (!items) {
      return NextResponse.json(
        { error: `Row ${index + 1} has no order items. Nothing was imported.` },
        { status: 400 }
      );
    }
    orders.push({
      customer_name: name.slice(0, 200),
      customer_email: email.slice(0, 200),
      customer_phone: String(row?.customer_phone ?? "").trim().slice(0, 60),
      wanted_date: wanted,
      items: items.slice(0, 100).map((item) => ({
        key: String(item?.key ?? "imported").slice(0, 100),
        name: String(item?.name ?? "Imported order").slice(0, 200),
        description: String(item?.description ?? "").slice(0, 500),
        price: Math.max(0, Number(item?.price) || 0),
        qty: Math.min(999, Math.max(1, Math.floor(Number(item?.qty) || 1))),
        bundleEligible: false,
      })),
      subtotal,
      notes: String(row?.notes ?? "").slice(0, 2000),
      admin_notes: String(row?.admin_notes ?? "").slice(0, 2000),
      status: STATUSES.has(row?.status) ? row.status : "pending",
      payment_status: PAYMENTS.has(row?.payment_status) ? row.payment_status : "not_arranged",
    });
  }

  try {
    // One transaction: a bad row cannot leave a half-finished import behind.
    const result = await callBonbonsAdmin("import_orders", { orders });
    return NextResponse.json({ imported: Number(result?.imported ?? orders.length) });
  } catch (error) { return menuError(error); }
}
