import { NextResponse } from "next/server";
import { normalizeCouponCode } from "@/lib/coupons";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { getProducts } from "@/lib/products";
import { getFeaturedWeeklyBox, getShopSettings } from "@/lib/weekly-box-data";
import { normalizeOrderItems } from "@/lib/order-menu";
import { getCartPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const code = normalizeCouponCode(body.code);
    if (!Array.isArray(body.items) || !body.items.length) throw new Error("Add your items before applying a coupon.");
    const [products, settings, weeklyBox] = await Promise.all([getProducts(), getShopSettings(), getFeaturedWeeklyBox()]);
    const items = normalizeOrderItems(body.items, products, { ...settings, weeklyBox });
    const { subtotal } = getCartPricing(items, settings);
    const coupon = await callBonbonsAdmin("coupon_preview", { code, subtotal });
    return NextResponse.json({ coupon }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Could not check this coupon." }, { status: error.status || 400 });
  }
}
