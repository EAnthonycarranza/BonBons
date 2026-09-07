import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callSupabaseData, toProduct } from "@/lib/supabase-data";
import { validateMenuProduct } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const { data } = await callSupabaseData("list_products");
    return NextResponse.json({ products: data.map(toProduct) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const product = validateMenuProduct(await request.json());
    const { data } = await callSupabaseData("create_product", { product });
    refreshMenu();
    return NextResponse.json({ product: toProduct(data) }, { status: 201 });
  } catch (error) { return menuError(error); }
}
