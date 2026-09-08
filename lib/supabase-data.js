import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const INTERNAL_API_TOKEN = process.env.BONBONS_INTERNAL_API_TOKEN;

export function hasSupabasePublicConfig() {
  return Boolean(SUPABASE_URL?.trim() && SUPABASE_PUBLISHABLE_KEY?.trim());
}

export function hasSupabaseDatabase() {
  return hasSupabasePublicConfig() && Boolean(INTERNAL_API_TOKEN?.trim());
}

export function createPublicSupabaseClient() {
  if (!hasSupabasePublicConfig()) {
    throw new Error("Supabase public configuration is missing.");
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function callSupabaseData(action, payload = {}) {
  if (!hasSupabaseDatabase()) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/bonbons-data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      "x-internal-token": INTERNAL_API_TOKEN,
    },
    body: JSON.stringify({ action, payload }),
    cache: "no-store",
    signal: AbortSignal.timeout(action === "upload_menu_photo" ? 30000 : 15000),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Supabase request failed.");
    error.status = response.status;
    throw error;
  }
  return result;
}

export function productToRow(product) {
  return {
    slug: String(product.slug || "").trim(),
    name: String(product.name || "").trim(),
    blurb: String(product.blurb || ""),
    description: String(product.description || ""),
    price: Number(product.price),
    unit: String(product.unit || ""),
    bundle_eligible: product.bundleEligible === true,
    image: String(product.image || ""),
    icon: String(product.icon || "i-cakepop"),
    color: String(product.color || "#FF2E9A"),
    tint: String(product.tint || "255,46,154"),
    badge: String(product.badge || ""),
    badge_class: String(product.badgeClass || ""),
    category: String(product.category || "everyday"),
    lead_time_hours: Math.max(0, Math.floor(Number(product.leadTimeHours) || 72)),
    allergens: Array.isArray(product.allergens) ? product.allergens.map(String) : [],
    active: product.active !== false,
    sort_order: Math.floor(Number(product.sortOrder) || 0),
  };
}

export function toProduct(row) {
  return {
    _id: String(row.id),
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    blurb: row.blurb,
    description: row.description,
    price: Number(row.price),
    unit: row.unit,
    bundleEligible: row.bundle_eligible === true,
    image: row.image,
    icon: row.icon,
    color: row.color,
    tint: row.tint,
    badge: row.badge,
    badgeClass: row.badge_class,
    category: row.category,
    leadTimeHours: row.lead_time_hours,
    allergens: row.allergens || [],
    active: row.active,
    sortOrder: row.sort_order,
    // Missing until the inventory migration runs; null means made to order.
    stockQuantity: row.stock_quantity === null || row.stock_quantity === undefined ? null : Number(row.stock_quantity),
    lowStockThreshold: Number(row.low_stock_threshold ?? 3),
    deletedAt: row.deleted_at || null,
    sourceUrl: row.source_url || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// `stock_quantity` is absent until the inventory migration is applied; treat a
// missing column as "not tracked" so the shop keeps working either way.
export function toWeeklyBox(row) {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    tagline: row.tagline || "",
    description: row.description || "",
    price: Number(row.price),
    stockQuantity: Number(row.stock_quantity ?? 0),
    initialStock: Number(row.initial_stock ?? row.stock_quantity ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? 5),
    items: Array.isArray(row.items) ? row.items : [],
    image: row.image || "",
    featured: row.featured === true,
    active: row.active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toShopSettings(row) {
  return {
    singlePopPrice: Number(row?.single_pop_price ?? 4),
    fourPackPrice: Number(row?.four_pack_price ?? 10),
    updatedAt: row?.updated_at || null,
  };
}

export function orderToRow(order) {
  return {
    items: order.items,
    subtotal: Number(order.subtotal) || 0,
    customer_name: order.customer.name,
    customer_email: order.customer.email,
    customer_phone: order.customer.phone,
    fulfilment: "Pickup",
    wanted_date: order.wantedDate,
    notes: order.notes || "",
  };
}

export function toOrder(row) {
  return {
    _id: String(row.id),
    id: String(row.id),
    items: row.items || [],
    subtotal: Number(row.subtotal),
    customer: {
      name: row.customer_name,
      email: row.customer_email,
      phone: row.customer_phone,
    },
    fulfilment: row.fulfilment,
    wantedDate: row.wanted_date,
    notes: row.notes,
    adminNotes: row.admin_notes,
    paymentStatus: row.payment_status,
    status: row.status,
    orderNumber: row.order_number,
    confirmedAt: row.confirmed_at,
    confirmedTotal: row.confirmed_total === null ? null : Number(row.confirmed_total),
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    pickupLocation: row.pickup_location,
    paymentInstructions: row.payment_instructions,
    confirmationSentAt: row.confirmation_sent_at,
    lastUpdateSentAt: row.last_update_sent_at,
    receiptSentAt: row.receipt_sent_at,
    receiptEmailError: row.receipt_email_error || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function quoteToRow(quote) {
  return {
    name: quote.name,
    email: quote.email,
    phone: quote.phone,
    event_date: quote.eventDate,
    occasion: quote.occasion,
    guests: quote.guests,
    fulfilment: "Pickup",
    zip: "",
    interests: quote.interests,
    colors: quote.colors,
    notes: quote.notes,
  };
}

export function toQuote(row) {
  return {
    _id: String(row.id),
    id: String(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    eventDate: row.event_date,
    occasion: row.occasion,
    guests: row.guests,
    fulfilment: row.fulfilment,
    zip: row.zip,
    interests: row.interests || [],
    colors: row.colors,
    notes: row.notes,
    adminNotes: row.admin_notes,
    paymentStatus: row.payment_status,
    status: row.status,
    orderNumber: row.order_number,
    confirmedAt: row.confirmed_at,
    confirmedTotal: row.confirmed_total === null ? null : Number(row.confirmed_total),
    pickupDate: row.pickup_date,
    pickupTime: row.pickup_time,
    pickupLocation: row.pickup_location,
    paymentInstructions: row.payment_instructions,
    confirmationSentAt: row.confirmation_sent_at,
    lastUpdateSentAt: row.last_update_sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toPickupLocation(row) {
  return {
    id: String(row.id),
    label: row.label,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    formattedAddress: row.formatted_address,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
