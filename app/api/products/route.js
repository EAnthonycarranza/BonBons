import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { hasSupabasePublicConfig } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products, source: hasSupabasePublicConfig() ? "supabase" : "sample" });
}

export async function POST(request) {
  const { POST: createMenuItem } = await import("@/app/api/admin/menu/route");
  return createMenuItem(request);
}
