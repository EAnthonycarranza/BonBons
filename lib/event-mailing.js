import "server-only";
import { callBonbonsAdmin } from "./supabase-data.js";
import { sendEventEmail } from "./email.js";
import { buildEventUpdateEmail } from "./event-email.js";
import { toEvent } from "./events.js";

export function eventSiteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3011");
  if (!["https:","http:"].includes(url.protocol)) throw new Error("Set a valid public website URL.");
  return url.origin;
}
export async function processEventEmailBatch(id) {
  const deliveries = await callBonbonsAdmin("event_campaign_claim", { id });
  for (const delivery of deliveries) {
    const current = await callBonbonsAdmin("event_delivery_check", { id: delivery.id, attempt: delivery.attempt });
    if (!current.active) { await callBonbonsAdmin("event_delivery_finish", { id: delivery.id, attempt: delivery.attempt, status: "skipped" }); continue; }
    const siteUrl = eventSiteUrl();
    const unsubscribeUrl = `${siteUrl}/api/updates/unsubscribe?token=${delivery.unsubscribeToken}`;
    const message = buildEventUpdateEmail({ design: delivery.snapshot.design, events: delivery.snapshot.events.map(toEvent), siteUrl, unsubscribeUrl: `${siteUrl}/updates/unsubscribe?token=${delivery.unsubscribeToken}` });
    let result;
    try { result = await sendEventEmail({ recipient: delivery.email, message, unsubscribeUrl, deliveryId: delivery.id }); }
    catch {
      await callBonbonsAdmin("event_delivery_finish", { id: delivery.id, attempt: delivery.attempt, status: "failed", error: "The sender did not confirm delivery. Check Gmail before retrying." });
      continue;
    }
    // If recording fails after SMTP accepted the message, leave it in progress.
    // It requires explicit review rather than an automatic duplicate send.
    await callBonbonsAdmin("event_delivery_finish", { id: delivery.id, attempt: delivery.attempt, status: "sent", messageId: result.messageId });
  }
  return callBonbonsAdmin("event_campaign_status", { id });
}
