import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { generateCouponCodes, toCoupon, validateCouponBatch } from "@/lib/coupons";

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
    const create = codes => callBonbonsAdmin("coupon_create", {
      codes, name: form.name, discount_amount: form.discountAmount,
      minimum_subtotal: form.minimumSubtotal, max_redemptions: form.maxRedemptions,
      expires_on: form.expiresOn || null,
    });
    // Short codes can collide with an existing one; the batch is saved in one
    // transaction, so a collision saves nothing and a fresh batch is drawn.
    let rows;
    for (let attempt = 1; !rows; attempt++) {
      try { rows = await create(form.code ? [form.code] : generateCouponCodes(form.quantity, randomInt)); }
      catch (error) { if (form.code || error.status !== 409 || attempt === 3) throw error; }
    }
    return NextResponse.json({ coupons: rows.map(toCoupon) }, { status: 201 });
  } catch (error) { return menuError(error); }
}

export async function DELETE(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || !ids.every(id => /^\d+$/.test(String(id)))) {
      throw new Error("Choose the coupons to delete.");
    }
    const deleted = await callBonbonsAdmin("coupon_delete", { ids: ids.map(String) });
    return NextResponse.json({ deleted });
  } catch (error) { return menuError(error); }
}
