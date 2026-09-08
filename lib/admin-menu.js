import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isAdmin } from "./auth";
import { hasSupabaseDatabase } from "./supabase-data";
import { SHOP_SETTINGS_TAG } from "./weekly-box";

export async function menuGuard(request, mutation = false) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  if (mutation) {
    const origin = request.headers.get("origin");
    const allowed = new Set([new URL(request.url).origin, process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean));
    // Next's development server can normalize 127.0.0.1 to localhost internally.
    if (process.env.NODE_ENV === "development") {
      const port = new URL(request.url).port;
      for (const host of ["localhost", "127.0.0.1"]) allowed.add(`http://${host}${port ? `:${port}` : ""}`);
    }
    if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowed.has(origin))) {
      return NextResponse.json({ error: "This request must come from your admin dashboard." }, { status: 403 });
    }
  }
  if (!hasSupabaseDatabase()) return NextResponse.json({ error: "The menu database is not connected." }, { status: 503 });
  return null;
}

export function refreshMenu() {
  // Prices are read with a cache tag so static pages can quote them.
  revalidateTag(SHOP_SETTINGS_TAG);
  for (const path of ["/", "/shop", "/build-a-box", "/box-of-the-week", "/sitemap.xml"]) revalidatePath(path);
  revalidatePath("/shop/[slug]", "page");
}

export function menuError(error) {
  return NextResponse.json({ error: error.message || "Could not save this menu item." }, { status: error.status || 400 });
}
