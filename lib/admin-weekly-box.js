import "server-only";
import { callBonbonsAdmin, toProduct } from "./supabase-data";
import { canonicalBoxItems } from "./bundles";
import { validateWeeklyBox } from "../supabase/functions/_shared/menu";

export async function prepareWeeklyBox(input) {
  const rows = await callBonbonsAdmin("menu_list");
  const products = rows.map(toProduct).filter((product) => !product.deletedAt);
  const items = canonicalBoxItems(input.items || [], products);
  return validateWeeklyBox({ ...input, items });
}
