import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin, toOrder } from "@/lib/supabase-data";
import { processOrderNotifications } from "@/lib/order-notifications";
export const dynamic = "force-dynamic";
export async function POST(request, { params }) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { id } = await params;
    if (!/^[1-9]\d*$/.test(id)) throw new Error("Choose a saved order.");
    await callBonbonsAdmin("order_notification_retry", { orderId: id });
    try {
      await processOrderNotifications({ orderId: id });
    } catch {}
    const row = await callBonbonsAdmin("order_notification_order", {
      orderId: id,
    });
    return NextResponse.json(
      { record: toOrder(row) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return menuError(error);
  }
}
