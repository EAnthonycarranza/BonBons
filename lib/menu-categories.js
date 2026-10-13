import {
  menuSlug,
  MenuValidationError,
} from "../supabase/functions/_shared/menu.js";
import {
  isMysteryBag,
  bagContents,
  sellingContainer,
} from "./product-offerings.js";

export const TREAT_TYPES = [
  ["cake-pops", "Cake pops"],
  ["pretzel-rods", "Pretzel rods"],
  ["rice-crispy-treats", "Rice crispy treats"],
  ["dipped-oreos", "Dipped Oreos"],
  ["other", "Other treats, cookies & baked goods"],
];
export const DEFAULT_MENU_CATEGORIES = [
  { slug: "everyday", name: "Cake Pops", treatType: "cake-pops", sortOrder: 0 },
  {
    slug: "pretzel-rods",
    name: "Pretzel Rods",
    treatType: "pretzel-rods",
    sortOrder: 10,
  },
  {
    slug: "rice-crispy-treats",
    name: "Dipped Rice Crispy Treats",
    treatType: "rice-crispy-treats",
    sortOrder: 20,
  },
  {
    slug: "dipped-oreos",
    name: "Dipped Oreos",
    treatType: "dipped-oreos",
    sortOrder: 30,
  },
  {
    slug: "custom",
    name: "Specialty & Custom Cake Pops",
    treatType: "cake-pops",
    sortOrder: 40,
  },
];
export function categoryName(product) {
  return (
    product.categoryLabel ||
    DEFAULT_MENU_CATEGORIES.find(
      (category) => category.slug === product.category,
    )?.name ||
    String(product.category || "Treats").replace(/-/g, " ")
  );
}
export function validateCategory(input) {
  const name =
    typeof input?.name === "string"
      ? input.name.trim().replace(/\s+/g, " ")
      : "";
  if (!name || name.length > 60)
    throw new MenuValidationError("Enter a category name of 1–60 characters.");
  const slug = input.slug || menuSlug(name);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100)
    throw new MenuValidationError(
      "Use letters or numbers in the category name.",
    );
  const treatType = input.treatType || "other";
  if (!TREAT_TYPES.some(([value]) => value === treatType))
    throw new MenuValidationError("Choose a treat type from the list.");
  const sortOrder = input.sortOrder ?? 50;
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000)
    throw new MenuValidationError(
      "Category order must be a whole number from 0 to 10000.",
    );
  return { slug, name, treat_type: treatType, sort_order: sortOrder };
}
export function sellingUnit(product) {
  const count = Number(product.unitCount ?? product.unit_count ?? 1);
  return count > 1
    ? `${count} ${product.unitLabel || product.unit_label || "treats"}`
    : "each";
}
export function saleDescription(product) {
  return [
    isMysteryBag(product)
      ? `Mystery bag · ${bagContents(product)} · assortment chosen by Bon Bon`
      : Number(product.unitCount || 1) > 1
        ? `Batch of ${sellingUnit(product)}`
        : "",
    product.blurb,
  ]
    .filter(Boolean)
    .join(" · ");
}
export function boxItemLabel(item) {
  const count = Number(item.unit_count || 1);
  return `${item.name}${isMysteryBag(item) ? ` (${bagContents(item)} per bag)` : count > 1 ? ` (${count} ${item.unit_label || "treats"} per ${sellingContainer(item)})` : ""} ×${item.qty}`;
}
