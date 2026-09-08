import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin, callSupabaseData, toProduct } from "@/lib/supabase-data";
import { MENU_PRICE, validateMenuProduct } from "@/supabase/functions/_shared/menu";

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
    // See the note in [id]/route.js: create at a price the deployed Edge
    // Function accepts, then apply the owner's price and stock.
    const { data } = await callSupabaseData("create_product", {
      product: { ...product, price: MENU_PRICE },
    });
    const saved = await callBonbonsAdmin("update_product_pricing", {
      id: data.id,
      price: product.price,
      stock_quantity: product.stock_quantity,
      low_stock_threshold: product.low_stock_threshold,
    });
    refreshMenu();
    return NextResponse.json({ product: toProduct(saved) }, { status: 201 });
  } catch (error) { return menuError(error); }
}
