import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validatePageContent } from "@/lib/page-content";

export const dynamic = "force-dynamic";
const pageForEditor = page => ({ ...page, draft_content: validatePageContent(page.slug, page.draft_content), published_content: validatePageContent(page.slug, page.published_content) });
export async function GET(request) {
  const blocked = await menuGuard(request);
  if (blocked) return blocked;
  try {
    const pages = await callBonbonsAdmin("page_list");
    return NextResponse.json({ pages: pages.map(pageForEditor) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}
export async function PATCH(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    if (!["save", "publish"].includes(body.action)) throw new Error("Choose save draft or publish.");
    if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new Error("Reload the page editor before saving.");
    const content = validatePageContent(body.slug, body.content);
    const page = await callBonbonsAdmin(body.action === "publish" ? "page_publish" : "page_save", { slug: body.slug, content, revision: body.revision });
    if (body.action === "publish") {
      revalidatePath(body.slug === "home" ? "/" : "/about");
      revalidatePath("/sitemap.xml");
    }
    return NextResponse.json({ page: pageForEditor(page) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return menuError(error); }
}
