import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { toCoupon } from "@/lib/coupons";

export async function PATCH(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const { active } = await request.json();
    if (!/^\d+$/.test(id) || typeof active !== "boolean") throw new Error("Choose a valid coupon and its availability.");
    const row = await callBonbonsAdmin("coupon_update", { id, active });
    return NextResponse.json({ coupon: toCoupon(row) });
  } catch (error) { return menuError(error); }
}
