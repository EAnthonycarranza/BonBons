import { NextResponse } from "next/server";
import { menuGuard, menuError, refreshMenu } from "@/lib/admin-menu";
import { callSupabaseData, toProduct } from "@/lib/supabase-data";
import { validateMenuProduct } from "@/supabase/functions/_shared/menu";

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
    const { data } = await callSupabaseData(action, { id, product, expectedUpdatedAt });
    refreshMenu();
    return NextResponse.json({ product: toProduct(data) });
  } catch (error) { return menuError(error); }
}

export async function PATCH(request, context) { return mutate(request, context, false); }
export async function DELETE(request, context) { return mutate(request, context, true); }
