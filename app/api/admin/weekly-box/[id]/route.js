import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin, toWeeklyBox } from "@/lib/supabase-data";
import { prepareWeeklyBox } from "@/lib/admin-weekly-box";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    if (!/^[1-9]\d*$/.test(id)) throw new Error("Choose a saved box.");
    const body = await request.json();
    if (
      typeof body.expectedUpdatedAt !== "string" ||
      !Number.isFinite(Date.parse(body.expectedUpdatedAt))
    )
      throw new Error("Refresh the boxes before making changes.");
    const box = await prepareWeeklyBox(body);
    const data = await callBonbonsAdmin("update_weekly_box", {
      ...box,
      id,
      expectedUpdatedAt: body.expectedUpdatedAt,
    });
    refreshMenu();
    return NextResponse.json({ box: toWeeklyBox(data) });
  } catch (error) {
    return menuError(error);
  }
}

export async function DELETE(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    if (!/^[1-9]\d*$/.test(id)) throw new Error("Choose a saved box.");
    await callBonbonsAdmin("delete_weekly_box", { id });
    refreshMenu();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return menuError(error);
  }
}
