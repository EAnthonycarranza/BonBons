import "server-only";
import { callBonbonsAdmin, toOrder } from "./supabase-data";
import { sendIncomingOrderNotification } from "./email";
export async function processOrderNotifications({ orderId } = {}) {
  const jobs = await callBonbonsAdmin(
    "order_notification_claim",
    orderId ? { orderId } : {},
  );
  let sent = 0;
  for (const job of jobs) {
    let message;
    try {
      message = await sendIncomingOrderNotification(toOrder(job.order));
    } catch (error) {
      const uncertain = error.command === "DATA" && !error.responseCode;
      await callBonbonsAdmin("order_notification_finish", {
        orderId: job.order.id,
        lease: job.lease,
        status: uncertain ? "needs_review" : "retry",
        error: uncertain
          ? "Gmail delivery could not be confirmed. Check the inbox before retrying."
          : "The incoming order email could not be sent. It will retry automatically.",
      });
      continue;
    }
    // Once SMTP accepts it, never send again just because tracking failed.
    await callBonbonsAdmin("order_notification_finish", {
      orderId: job.order.id,
      lease: job.lease,
      status: "sent",
      messageId: message.messageId,
    });
    sent++;
  }
  return { processed: jobs.length, sent };
}
