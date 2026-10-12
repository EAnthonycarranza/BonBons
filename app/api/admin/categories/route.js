import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validateCategory } from "@/lib/menu-categories";

export const dynamic = "force-dynamic";
export async function GET(request) {
  const denied = await menuGuard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(
      { categories: await callBonbonsAdmin("category_list") },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return menuError(error);
  }
}
async function save(request, creating) {
  const denied = await menuGuard(request, true);
  if (denied) return denied;
  try {
    const body = await request.json();
    const category = validateCategory(body);
    const saved = await callBonbonsAdmin(
      creating ? "category_create" : "category_update",
      { ...category, expectedUpdatedAt: body.expectedUpdatedAt },
    );
    refreshMenu();
    return NextResponse.json(
      { category: saved },
      { status: creating ? 201 : 200 },
    );
  } catch (error) {
    return menuError(error);
  }
}
export async function POST(request) {
  return save(request, true);
}
export async function PATCH(request) {
  return save(request, false);
}
