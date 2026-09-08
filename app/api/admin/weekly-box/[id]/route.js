import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callSupabaseData, toWeeklyBox } from "@/lib/supabase-data";
import { validateWeeklyBox } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    const box = validateWeeklyBox(await request.json());
    const { data } = await callSupabaseData("update_weekly_box", { id, box });
    refreshMenu();
    return NextResponse.json({ box: toWeeklyBox(data) });
  } catch (error) { return menuError(error); }
}

export async function DELETE(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    await callSupabaseData("delete_weekly_box", { id });
    refreshMenu();
    return NextResponse.json({ ok: true });
  } catch (error) { return menuError(error); }
}
