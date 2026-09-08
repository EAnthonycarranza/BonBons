import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callSupabaseData, toWeeklyBox } from "@/lib/supabase-data";
import { validateWeeklyBox } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const { data } = await callSupabaseData("list_weekly_boxes");
    return NextResponse.json(
      { boxes: data.map(toWeeklyBox) },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) { return menuError(error); }
}

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const box = validateWeeklyBox(await request.json());
    const { data } = await callSupabaseData("create_weekly_box", { box });
    refreshMenu();
    return NextResponse.json({ box: toWeeklyBox(data) }, { status: 201 });
  } catch (error) { return menuError(error); }
}
