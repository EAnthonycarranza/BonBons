import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isEmail, isPhone } from "@/lib/format";
import { partySizeById, resolveEventType, EVENT_TYPE_OTHER } from "@/lib/cart-rental";
import {
  callSupabaseData,
  hasSupabaseDatabase,
  quoteToRow,
  toQuote,
} from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Validate on the server too — client-side checks are a convenience, not a guard.
  const errors = [];
  if (!body.name || !String(body.name).trim()) errors.push("name");
  if (!isEmail(body.email)) errors.push("email");
  if (!isPhone(body.phone)) errors.push("phone");
  if (!body.eventDate) errors.push("eventDate");
  const eventType = resolveEventType(body.eventType, body.eventTypeOther);
  if (!eventType) errors.push(String(body.eventType || "").trim() === EVENT_TYPE_OTHER ? "eventTypeOther" : "eventType");
  const partySize = partySizeById(body.partySize);
  if (!partySize) errors.push("partySize");
  if (errors.length) {
    return NextResponse.json(
      { error: `Please check these fields: ${errors.join(", ")}.` },
      { status: 400 }
    );
  }

  const doc = {
    name: String(body.name).trim(),
    email: String(body.email).trim().toLowerCase(),
    phone: String(body.phone || "").trim(),
    eventDate: String(body.eventDate),
    // Event type lands in `occasion`; the party-size tier's upper bound in
    // `guests`. Both existing columns, so no migration. See lib/cart-rental.js.
    occasion: eventType,
    guests: partySize.max,
    fulfilment: "Pickup",
    zip: "",
    interests: Array.isArray(body.interests) ? body.interests.slice(0, 20) : [],
    colors: String(body.colors || "").trim(),
    notes: String(body.notes || "").trim(),
  };

  if (!hasSupabaseDatabase()) {
    return NextResponse.json(
      { error: "Online requests are temporarily unavailable. Please call or text the owner instead." },
      { status: 503 }
    );
  }

  try {
    await callSupabaseData("create_quote", { quote: quoteToRow(doc) });
    return NextResponse.json({
      ok: true,
      stored: true,
      message:
        `Bonnie will contact you at ${doc.email} or ${doc.phone} to go over the event details, ` +
        "confirm flavors and price, and then coordinate the cart with you.",
    });
  } catch (err) {
    console.error("Quote save failed:", err.message);
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasSupabaseDatabase()) return NextResponse.json({ quotes: [] });
  try {
    const { data } = await callSupabaseData("list_quotes");
    return NextResponse.json({ quotes: data.map(toQuote) });
  } catch (err) {
    console.error("Request list failed:", err.message);
    return NextResponse.json({ error: "Could not load custom requests." }, { status: 503 });
  }
}
