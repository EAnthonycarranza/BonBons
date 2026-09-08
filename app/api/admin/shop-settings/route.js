import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callSupabaseData, toShopSettings } from "@/lib/supabase-data";
import { validateShopSettings } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const { data } = await callSupabaseData("get_shop_settings");
    return NextResponse.json(
      { settings: toShopSettings(data) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) { return menuError(error); }
}

export async function PATCH(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const settings = validateShopSettings({
      single_pop_price: body.singlePopPrice,
      four_pack_price: body.fourPackPrice,
    });
    const { data } = await callSupabaseData("update_shop_settings", { settings });
    refreshMenu();
    return NextResponse.json({ settings: toShopSettings(data) });
  } catch (error) { return menuError(error); }
}
