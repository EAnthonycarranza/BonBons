import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin, callSupabaseData, toProduct, toWeeklyBox } from "@/lib/supabase-data";
import { validateWeeklyBox } from "@/supabase/functions/_shared/menu";
import { assertBoxItemsAreCakePops } from "@/lib/bundles";

export const dynamic = "force-dynamic";

// The box holds cake pops only; rods are priced on their own shelf.
async function assertCakePopsOnly(items) {
  const { data } = await callSupabaseData("list_products");
  const live = (data || []).map(toProduct).filter((product) => !product.deletedAt);
  assertBoxItemsAreCakePops(items, live);
}


export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const data = await callBonbonsAdmin("list_weekly_boxes");
    return NextResponse.json(
      { boxes: (data || []).map(toWeeklyBox) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) { return menuError(error); }
}

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const box = validateWeeklyBox(await request.json());
    await assertCakePopsOnly(box.items);
    const data = await callBonbonsAdmin("create_weekly_box", box);
    refreshMenu();
    return NextResponse.json({ box: toWeeklyBox(data) }, { status: 201 });
  } catch (error) { return menuError(error); }
}
