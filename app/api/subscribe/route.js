import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { isEmail } from "@/lib/format";
import { callBonbonsAdmin, hasSupabaseDatabase } from "@/lib/supabase-data";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import { hasEmailConfiguration, sendEventEmail } from "@/lib/email";
import { buildSubscriptionEmail } from "@/lib/event-email";
import { eventSiteUrl } from "@/lib/event-mailing";

export const dynamic = "force-dynamic";
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const email = String(body?.email || "").trim().toLowerCase();
  if (email.length > 254 || !isEmail(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (body.consent !== true) return NextResponse.json({ error: "Please agree to receive event updates." }, { status: 400 });
  if (!hasSupabaseDatabase() || !hasEmailConfiguration()) return NextResponse.json({ error: "Email signup is temporarily unavailable. Please try again shortly." }, { status: 503 });
  const captcha = await verifyRecaptcha({ request, token: body.recaptchaToken, expectedAction: RECAPTCHA_ACTIONS.subscribe });
  if (!captcha.ok) return NextResponse.json({ error: "Please complete the security check and try again." }, { status: captcha.unavailable ? 503 : 403 });
  const token = randomBytes(24).toString("hex");
  try {
    const result = await callBonbonsAdmin("subscriber_request", { email, token, source: body.source === "events" ? "events" : "homepage" });
    if (result.send) {
      try {
        const siteUrl = eventSiteUrl();
        const message = buildSubscriptionEmail({ confirmationUrl: `${siteUrl}/updates/confirm?token=${token}`, siteUrl });
        await sendEventEmail({ recipient: email, message });
      } catch {
        await callBonbonsAdmin("subscriber_confirmation_failed", { email, token });
        return NextResponse.json({ error: "We couldn't send your confirmation. Please try again shortly." }, { status: 503 });
      }
    }
    return NextResponse.json({ ok: true, message: "Check your inbox to confirm event updates. If you're already subscribed, you're all set." }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Email signup is temporarily unavailable. Please try again shortly." }, { status: 503 }); }
}
