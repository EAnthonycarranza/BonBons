import "server-only";
import { createPublicSupabaseClient, hasSupabasePublicConfig } from "./supabase-data";
import { pageDefault, validatePageContent } from "./page-content";

export async function getPublishedPage(slug) {
  const fallback = pageDefault(slug);
  if (!fallback || !hasSupabasePublicConfig()) return fallback;
  try {
    const { data, error } = await createPublicSupabaseClient().from("site_pages")
      .select("slug,published_content,published_at").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data?.published_content ? validatePageContent(slug, data.published_content) : fallback;
  } catch (error) {
    console.error(`Could not read the ${slug} page:`, error.message);
    return fallback;
  }
}
