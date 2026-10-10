import "server-only";
import { createPublicSupabaseClient, hasSupabasePublicConfig } from "./supabase-data.js";
import { toEvent } from "./events.js";

export async function getPublicEvents() {
  if (!hasSupabasePublicConfig()) return [];
  const { data, error } = await createPublicSupabaseClient().from("local_events").select("*").in("status", ["published", "cancelled"]).order("event_date", { ascending: true });
  if (error) throw new Error("Could not load the local events.");
  return (data || []).map(toEvent);
}
