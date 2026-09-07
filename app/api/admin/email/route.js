import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { isEmail } from "@/lib/format";
import {
  hasEmailConfiguration,
  sendOrderEmail,
  verifyEmailConnection,
} from "@/lib/email";
import { callSupabaseData, toOrder, toQuote } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasEmailConfiguration()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  try {
    const { sender } = await verifyEmailConnection();
    return NextResponse.json({ configured: true, connected: true, sender });
  } catch (error) {
    console.error("Gmail verification failed:", error.code || error.message);
    return NextResponse.json({
      configured: true,
      connected: false,
      error: "Gmail needs attention. Check the sender address and app password.",
    });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasEmailConfiguration()) {
    return NextResponse.json({ error: "Gmail is not configured." }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind || "");
  const id = String(body.id || "");
  const emailType = String(body.emailType || "");
  if (!["orders", "quotes"].includes(kind) || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid order." }, { status: 400 });
  }
  if (!["request_received", "confirmation", "status_update"].includes(emailType) ||
      (emailType === "request_received" && kind !== "orders")) {
    return NextResponse.json({ error: "Invalid email type." }, { status: 400 });
  }

  try {
    const action = kind === "orders" ? "get_order" : "get_quote";
    const mapper = kind === "orders" ? toOrder : toQuote;
    const { data } = await callSupabaseData(action, { id });
    const record = mapper(data);
    const customer = kind === "orders" ? record.customer || {} : record;

    const isReceipt = emailType === "request_received";
    if (isReceipt && (record.orderNumber || !["pending", "contacted"].includes(record.status))) {
      return NextResponse.json({ error: "A request receipt is only available before order confirmation. Send an order update instead." }, { status: 409 });
    }
    if (!isReceipt && !record.orderNumber) {
      return NextResponse.json(
        { error: "Set the stage to Order Confirmed and save it before emailing the customer." },
        { status: 409 }
      );
    }
    if (!isEmail(customer.email)) {
      return NextResponse.json({ error: "This customer does not have a valid email." }, { status: 400 });
    }
    if (emailType === "confirmation" && record.confirmationSentAt && body.force !== true) {
      return NextResponse.json(
        { error: "A confirmation was already sent. Confirm the resend first." },
        { status: 409 }
      );
    }
    if (isReceipt && record.receiptSentAt && body.force !== true) {
      return NextResponse.json({ error: "A receipt was already sent. Confirm the resend first." }, { status: 409 });
    }

    const sent = await sendOrderEmail({
      record,
      kind,
      emailType,
      personalMessage: String(body.personalMessage || "").trim().slice(0, 2000),
    });

    let savedRecord = record;
    let trackingWarning = "";
    try {
      const tracked = await callSupabaseData("record_email", {
        record_kind: kind,
        record_id: id,
        order_number: record.orderNumber || "",
        email_type: emailType,
        recipient: sent.recipient,
        subject: sent.subject,
        provider_message_id: sent.messageId,
      });
      savedRecord = mapper(tracked.data);
    } catch (trackingError) {
      console.error("Email sent but tracking failed:", trackingError.message);
      trackingWarning = "Email sent, but the activity timestamp could not be saved.";
    }

    return NextResponse.json({
      ok: true,
      message: isReceipt ? `Request receipt sent to ${sent.recipient}.` : emailType === "confirmation"
        ? `Confirmation sent to ${sent.recipient}.`
        : `Order update sent to ${sent.recipient}.`,
      record: savedRecord,
      trackingWarning,
    });
  } catch (error) {
    console.error("Order email failed:", error.code || error.message);
    return NextResponse.json(
      { error: "The email could not be sent. Check the Gmail connection and try again." },
      { status: 502 }
    );
  }
}
