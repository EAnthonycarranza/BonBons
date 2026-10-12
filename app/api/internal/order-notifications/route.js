import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { processOrderNotifications } from "@/lib/order-notifications";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request) {
  const expected = process.env.BONBONS_INTERNAL_API_TOKEN || "",
    received = request.headers.get("x-internal-token") || "";
  const hash = (value) => createHash("sha256").update(value).digest();
  if (
    !expected ||
    !received ||
    !timingSafeEqual(hash(expected), hash(received))
  )
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  try {
    return NextResponse.json(await processOrderNotifications(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "The incoming order email queue needs attention." },
      { status: 503 },
    );
  }
}
