import { NextResponse } from "next/server";
import { SAMPLE_PRODUCTS } from "@/lib/sample-data";
import { isAdmin } from "@/lib/auth";
import {
  callSupabaseData,
  hasSupabaseDatabase,
  productToRow,
} from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

/** Loads the current starter catalogue into Supabase. Admin only and idempotent. */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasSupabaseDatabase()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const { created, updated } = await callSupabaseData("seed_products", {
      products: SAMPLE_PRODUCTS.map(productToRow),
    });
    return NextResponse.json({ ok: true, created, updated, total: SAMPLE_PRODUCTS.length });
  } catch (err) {
    console.error("Product seed failed:", err.message);
    return NextResponse.json({ error: "Could not seed products." }, { status: 500 });
  }
}
