import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin, toProduct } from "@/lib/supabase-data";
import { validateMenuProduct } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";
export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const [data, categories] = await Promise.all([
      callBonbonsAdmin("menu_list"),
      callBonbonsAdmin("category_list"),
    ]);
    return NextResponse.json(
      { products: data.map(toProduct), categories },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return menuError(error);
  }
}
export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const categories = await callBonbonsAdmin("category_list");
    const product = validateMenuProduct(await request.json(), categories);
    const saved = await callBonbonsAdmin("menu_create", { product });
    refreshMenu();
    return NextResponse.json({ product: toProduct(saved) }, { status: 201 });
  } catch (error) {
    return menuError(error);
  }
}
