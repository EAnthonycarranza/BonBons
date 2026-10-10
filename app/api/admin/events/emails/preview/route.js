import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validateEventEmail, toEvent } from "@/lib/events";
import { buildEventUpdateEmail } from "@/lib/event-email";
export const dynamic = "force-dynamic";
export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const { design: input } = await request.json();
    const design = validateEventEmail(input);
    const rows = await callBonbonsAdmin("event_list");
    const events = design.eventIds.map(id => {
      const row = rows.find(event => String(event.id) === id);
      if (!row || !["published", "cancelled"].includes(row.status)) throw new Error("An event in this draft is no longer published. Remove it or choose another event.");
      return toEvent(row);
    });
    const message = buildEventUpdateEmail({ design, events, siteUrl: new URL(request.headers.get("origin") || request.url).origin, unsubscribeUrl: "#unsubscribe-preview", preview: true });
    return NextResponse.json(message, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}
