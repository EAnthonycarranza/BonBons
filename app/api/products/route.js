import { NextResponse } from "next/server";
import { getProducts } from "@/lib/products";
import { connectToDatabase, hasDatabase } from "@/lib/mongodb";
import Product from "@/lib/models/Product";
import { isAdmin } from "@/lib/auth";
import { plain } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await getProducts();
  return NextResponse.json({ products, source: hasDatabase() ? "database" : "sample" });
}

export async function POST(request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "No database configured. Set MONGODB_URI in .env.local first." },
      { status: 503 }
    );
  }
  const conn = await connectToDatabase();
  if (!conn) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  try {
    const body = await request.json();
    if (!body.name || !body.slug || body.price == null) {
      return NextResponse.json({ error: "name, slug and price are required." }, { status: 400 });
    }
    const created = await Product.create(body);
    return NextResponse.json({ product: plain(created) }, { status: 201 });
  } catch (err) {
    const msg = err.code === 11000 ? "A product with that slug already exists." : err.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
