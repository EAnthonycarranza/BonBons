import { NextResponse } from "next/server";
import { isEmail } from "@/lib/format";
import { callSupabaseData, hasSupabaseDatabase } from "@/lib/supabase-data";

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

  if (!hasSupabaseDatabase()) {
    return NextResponse.json({ error: "Please try again shortly." }, { status: 503 });
  }

  try {
    await callSupabaseData("subscribe", { email: String(body.email).trim().toLowerCase() });
  } catch (err) {
    console.error("Subscribe failed:", err.message);
    return NextResponse.json({ error: "Please try again shortly." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: "Thanks! You're on the list." });
}
