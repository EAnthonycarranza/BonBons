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


export async function PATCH(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const box = validateWeeklyBox(await request.json());
    await assertCakePopsOnly(box.items);
    const data = await callBonbonsAdmin("update_weekly_box", { ...box, id });
    refreshMenu();
    return NextResponse.json({ box: toWeeklyBox(data) });
  } catch (error) { return menuError(error); }
}

export async function DELETE(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    await callBonbonsAdmin("delete_weekly_box", { id });
    refreshMenu();
    return NextResponse.json({ ok: true });
  } catch (error) { return menuError(error); }
}
