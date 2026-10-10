import { NextResponse } from "next/server";
import { callBonbonsAdmin } from "@/lib/supabase-data";
export async function POST(request) {
  try {
    // Email providers POST to the header URL; customers use the confirmation page.
    const queryToken = new URL(request.url).searchParams.get("token");
    const token = queryToken || (await request.json()).token;
    if (!/^[a-f0-9]{48}$/.test(token || "")) throw new Error("This unsubscribe link is invalid.");
    await callBonbonsAdmin("subscriber_unsubscribe", { token });
    return NextResponse.json({ ok: true, message: "You've unsubscribed from event updates." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "This unsubscribe link is invalid or temporarily unavailable." }, { status: 400, headers: { "Cache-Control": "no-store" } }); }
}
