import { NextResponse } from "next/server";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validatePhysicalRedemption } from "@/lib/coupons";
import { RECAPTCHA_ACTIONS } from "@/lib/recaptcha-actions";
import { verifyRecaptcha } from "@/lib/recaptcha";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body, payload;
  try {
    body = await request.json();
    payload = validatePhysicalRedemption(body);
    if (body.ready !== true) throw new Error("Redeem only when the shop is ready to apply the discount to your purchase.");
  } catch (error) {
    return NextResponse.json({ error: error.message || "Invalid request." }, { status: 400 });
  }
  const captcha = await verifyRecaptcha({ request, token: body.recaptchaToken, expectedAction: RECAPTCHA_ACTIONS.coupon });
  if (!captcha.ok) return NextResponse.json({ error: captcha.unavailable ? "The security check is temporarily unavailable. Please try again shortly." : "Complete the security check again before redeeming." }, { status: captcha.unavailable ? 503 : 403 });
  try {
    const receipt = await callBonbonsAdmin("coupon_redeem", { ...payload, channel: "customer" });
    return NextResponse.json({ receipt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.status && error.status < 500 ? error.message : "Could not redeem your coupon. Please try again or ask the shop for help." }, { status: error.status && error.status < 500 ? error.status : 503 });
  }
}
