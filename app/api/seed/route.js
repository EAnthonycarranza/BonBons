import { NextResponse } from "next/server";
import { connectToDatabase, hasDatabase } from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import { SAMPLE_PRODUCTS } from "@/lib/sample-data";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Loads the sample catalogue into MongoDB. Admin only, and safe to re-run. */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json({ error: "Set MONGODB_URI in .env.local first." }, { status: 503 });
  }
  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  let created = 0;
  let updated = 0;
  for (const p of SAMPLE_PRODUCTS) {
    const res = await Product.updateOne({ slug: p.slug }, { $set: p }, { upsert: true });
    if (res.upsertedCount) created += 1;
    else if (res.modifiedCount) updated += 1;
  }
  return NextResponse.json({ ok: true, created, updated, total: SAMPLE_PRODUCTS.length });
}
