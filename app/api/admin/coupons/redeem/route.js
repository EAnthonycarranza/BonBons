import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validatePhysicalRedemption } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const redemptions = await callBonbonsAdmin("coupon_redemptions");
    return NextResponse.json({ redemptions }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const payload = validatePhysicalRedemption(await request.json());
    const receipt = await callBonbonsAdmin("coupon_redeem", { ...payload, channel: "admin" });
    return NextResponse.json({ receipt }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}
