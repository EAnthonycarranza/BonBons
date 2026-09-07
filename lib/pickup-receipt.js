import "server-only";
import { sendOrderEmail } from "./email";
import { callSupabaseData } from "./supabase-data";

// Called only after the request is saved. SMTP or tracking errors must never
// turn a successful order save into an error that prompts a duplicate request.
export async function sendPickupReceipt(record) {
  let sent;
  try {
    sent = await sendOrderEmail({ record, kind: "orders", emailType: "request_received" });
  } catch (error) {
    console.error("Pickup receipt failed:", error.code || "email-unavailable");
    try {
      await callSupabaseData("record_receipt_failure", { id: record._id });
    } catch {
      console.error("Pickup receipt failure could not be tracked.");
    }
    return { sent: false };
  }

  try {
    await callSupabaseData("record_email", {
      record_kind: "orders", record_id: record._id, order_number: "",
      email_type: "request_received", recipient: sent.recipient,
      subject: sent.subject, provider_message_id: sent.messageId,
    });
  } catch {
    console.error("Pickup receipt sent, but its activity could not be tracked.");
  }
  return { sent: true };
}
