import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callBonbonsAdmin, callSupabaseData, toProduct } from "@/lib/supabase-data";
import { MENU_PRICE, validateMenuProduct } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

async function mutate(request, context, deleting) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await context.params;
    if (!/^[1-9]\d*$/.test(id)) return NextResponse.json({ error: "Invalid menu item." }, { status: 400 });
    const body = await request.json();
    const expectedUpdatedAt = body.expectedUpdatedAt;
    if (typeof expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(expectedUpdatedAt))) {
      return NextResponse.json({ error: "Refresh the menu before making changes." }, { status: 400 });
    }
    const restoring = !deleting && body.restore === true;
    const action = deleting ? "delete_product" : restoring ? "restore_product" : "update_product";
    const product = deleting || restoring ? undefined : validateMenuProduct(body);
    // The deployed Edge Function still fixes singles at $4 and knows nothing
    // about stock, so send it a price it accepts and apply the owner's real
    // price and quantity through the database function straight after. Sending
    // $4 stays valid once the function is redeployed, and the second write
    // corrects it either way.
    const { data } = await callSupabaseData(action, {
      id,
      product: product ? { ...product, price: MENU_PRICE } : undefined,
      expectedUpdatedAt,
    });
    let saved = data;
    if (product) {
      saved = await callBonbonsAdmin("update_product_pricing", {
        id,
        price: product.price,
        stock_quantity: product.stock_quantity,
        low_stock_threshold: product.low_stock_threshold,
        category: product.category,
        bundle_eligible: product.bundle_eligible,
      });
    }
    refreshMenu();
    return NextResponse.json({ product: toProduct(saved) });
  } catch (error) { return menuError(error); }
}

export async function PATCH(request, context) { return mutate(request, context, false); }
export async function DELETE(request, context) { return mutate(request, context, true); }
