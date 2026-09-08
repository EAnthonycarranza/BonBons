import "server-only";
import {
  createPublicSupabaseClient,
  hasSupabasePublicConfig,
  toWeeklyBox,
  toShopSettings,
} from "./supabase-data";
import { DEFAULT_FOUR_PACK_PRICE, DEFAULT_SINGLE_POP_PRICE } from "./weekly-box";

const FALLBACK_SETTINGS = {
  singlePopPrice: DEFAULT_SINGLE_POP_PRICE,
  fourPackPrice: DEFAULT_FOUR_PACK_PRICE,
  updatedAt: null,
};

/**
 * The live Box of the Week, or null when there isn't one.
 *
 * Returns null rather than throwing when the table is missing, so the shop
 * still renders on a database that has not had the Box of the Week migration
 * applied yet.
 */
export async function getFeaturedWeeklyBox() {
  if (!hasSupabasePublicConfig()) return null;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("weekly_boxes")
      .select("*")
      .eq("active", true)
      .eq("featured", true)
      .maybeSingle();
    if (error) throw error;
    return data ? toWeeklyBox(data) : null;
  } catch (err) {
    console.error("The Box of the Week is unavailable:", err.message);
    return null;
  }
}

/** Owner-set prices, falling back to the launch prices if unavailable. */
export async function getShopSettings() {
  if (!hasSupabasePublicConfig()) return FALLBACK_SETTINGS;
  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("shop_settings").select("*").maybeSingle();
    if (error) throw error;
    return data ? toShopSettings(data) : FALLBACK_SETTINGS;
  } catch (err) {
    console.error("Shop prices are unavailable, using defaults:", err.message);
    return FALLBACK_SETTINGS;
  }
}
