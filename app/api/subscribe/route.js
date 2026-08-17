import { NextResponse } from "next/server";
import { connectToDatabase, hasDatabase } from "@/lib/mongodb";
import Subscriber from "@/lib/models/Subscriber";
import { isEmail } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  if (!hasDatabase()) {
    return NextResponse.json({
      ok: true,
      message: "Thanks! (Preview mode — the mailing list isn't connected yet.)",
    });
  }

  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ error: "Please try again shortly." }, { status: 503 });

  try {
    await Subscriber.create({ email: body.email });
  } catch (err) {
    // Duplicate email is a success from the visitor's point of view.
    if (err.code !== 11000) {
      console.error("Subscribe failed:", err.message);
      return NextResponse.json({ error: "Please try again shortly." }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true, message: "Thanks! You're on the list." });
}
