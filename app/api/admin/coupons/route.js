import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { toCoupon, validateCouponBatch } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const rows = await callBonbonsAdmin("coupon_list");
    return NextResponse.json({ coupons: rows.map(toCoupon) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const form = validateCouponBatch(await request.json());
    const codes = form.code ? [form.code] : Array.from({ length: form.quantity }, () => `BB-${randomBytes(8).toString("hex").toUpperCase()}`);
    const rows = await callBonbonsAdmin("coupon_create", {
      codes, name: form.name, discount_amount: form.discountAmount,
      minimum_subtotal: form.minimumSubtotal, max_redemptions: form.maxRedemptions,
      expires_on: form.expiresOn || null,
    });
    return NextResponse.json({ coupons: rows.map(toCoupon) }, { status: 201 });
  } catch (error) { return menuError(error); }
}
