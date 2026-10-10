import { NextResponse } from "next/server";
import { callBonbonsAdmin } from "@/lib/supabase-data";
export async function POST(request) {
  try {
    const body = await request.json();
    if (!/^[a-f0-9]{48}$/.test(body?.token || "")) throw new Error("This confirmation link is invalid. Please sign up again.");
    await callBonbonsAdmin("subscriber_confirm", { token: body.token });
    return NextResponse.json({ ok: true, message: "You're subscribed! We'll email you about upcoming local events." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return NextResponse.json({ error: error.message || "This link has expired. Please sign up again." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
}
