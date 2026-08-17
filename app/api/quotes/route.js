import { NextResponse } from "next/server";
import { connectToDatabase, hasDatabase } from "@/lib/mongodb";
import Quote from "@/lib/models/Quote";
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

  // Validate on the server too — client-side checks are a convenience, not a guard.
  const errors = [];
  if (!body.name || !String(body.name).trim()) errors.push("name");
  if (!isEmail(body.email)) errors.push("email");
  if (!body.eventDate) errors.push("eventDate");
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
    occasion: String(body.occasion || ""),
    guests: body.guests ? Number(body.guests) : null,
    fulfilment: body.fulfilment === "Delivery" ? "Delivery" : "Pickup",
    zip: String(body.zip || "").trim(),
    interests: Array.isArray(body.interests) ? body.interests.slice(0, 20) : [],
    colors: String(body.colors || "").trim(),
    notes: String(body.notes || "").trim(),
  };

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      stored: false,
      message:
        "This preview isn't connected to a database yet, so nothing was saved. " +
        "Once MongoDB is set up, requests like this land in the admin dashboard.",
    });
  }

  const conn = await connectToDatabase();
  if (!conn) {
    return NextResponse.json(
      { error: "We couldn't reach the database. Please call or text us instead." },
      { status: 503 }
    );
  }

  try {
    await Quote.create(doc);
    return NextResponse.json({
      ok: true,
      stored: true,
      message: `We'll email a quote to ${doc.email}, usually the same business day.`,
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
  if (!hasDatabase()) return NextResponse.json({ quotes: [] });
  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ quotes: [] });
  const quotes = await Quote.find().sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ quotes: quotes.map(plain) });
}
