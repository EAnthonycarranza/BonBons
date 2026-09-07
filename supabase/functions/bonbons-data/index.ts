import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.4";
import { validateMenuProduct, MENU_IMAGE_BUCKET, MENU_IMAGE_MAX_BYTES } from "../_shared/menu.js";

const EXPECTED_TOKEN_HASH = "ccc8ac8138efd27c19994d11d13b4e41efcc6b1273bfdfb87d39060e35ff0df5";
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function secureEquals(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function cleanProduct(value: unknown) {
  const input = object(value);
  return {
    slug: String(input.slug || "").trim(),
    name: String(input.name || "").trim(),
    blurb: String(input.blurb || ""),
    description: String(input.description || ""),
    price: Number(input.price),
    unit: String(input.unit || ""),
    bundle_eligible: input.bundle_eligible === true,
    image: String(input.image || ""),
    icon: String(input.icon || "i-cakepop"),
    color: String(input.color || "#FF2E9A"),
    tint: String(input.tint || "255,46,154"),
    badge: String(input.badge || ""),
    badge_class: String(input.badge_class || ""),
    category: String(input.category || "everyday"),
    lead_time_hours: Math.max(0, Math.floor(Number(input.lead_time_hours) || 72)),
    allergens: Array.isArray(input.allergens) ? input.allergens.map(String).slice(0, 20) : [],
    active: input.active !== false,
    sort_order: Math.floor(Number(input.sort_order) || 0),
    updated_at: new Date().toISOString(),
  };
}

function cleanOrder(value: unknown) {
  const input = object(value);
  return {
    items: Array.isArray(input.items) ? input.items.slice(0, 100) : [],
    subtotal: Number(input.subtotal) || 0,
    customer_name: String(input.customer_name || "").trim(),
    customer_email: String(input.customer_email || "").trim().toLowerCase(),
    customer_phone: String(input.customer_phone || "").trim(),
    fulfilment: "Pickup",
    wanted_date: String(input.wanted_date || ""),
    notes: String(input.notes || "").trim().slice(0, 8000),
  };
}

function cleanQuote(value: unknown) {
  const input = object(value);
  const guests = Number(input.guests);
  return {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    phone: String(input.phone || "").trim(),
    event_date: String(input.event_date || ""),
    occasion: String(input.occasion || "").trim(),
    guests: Number.isFinite(guests) && guests > 0 ? Math.floor(guests) : null,
    fulfilment: "Pickup",
    zip: "",
    interests: Array.isArray(input.interests) ? input.interests.map(String).slice(0, 20) : [],
    colors: String(input.colors || "").trim().slice(0, 2000),
    notes: String(input.notes || "").trim().slice(0, 8000),
  };
}

function cleanPickupLocation(value: unknown) {
  const input = object(value);
  const label = String(input.label || "").trim().slice(0, 80);
  const streetAddress = String(input.street_address || "").trim().slice(0, 200);
  const city = String(input.city || "").trim().slice(0, 100);
  const state = String(input.state || "").trim().slice(0, 100);
  const postalCode = String(input.postal_code || "").trim().slice(0, 20);
  const country = String(input.country || "").trim().slice(0, 100);
  return {
    label,
    street_address: streetAddress,
    city,
    state,
    postal_code: postalCode,
    country,
    formatted_address: `${streetAddress}, ${city}, ${state} ${postalCode}, ${country}`,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const suppliedToken = request.headers.get("x-internal-token") || "";
  const suppliedHash = suppliedToken ? await sha256(suppliedToken) : "";
  if (!secureEquals(suppliedHash, EXPECTED_TOKEN_HASH)) {
    return json({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase service credentials are unavailable." }, 500);
  }

  let body: Record<string, unknown>;
  try {
    body = object(await request.json());
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const action = String(body.action || "");
  const payload = object(body.payload);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (action === "create_order") {
      const { data, error } = await supabase
        .from("orders")
        .insert(cleanOrder(payload.order))
        .select()
        .single();
      if (error) throw error;
      return json({ data });
    }

    if (action === "list_orders") {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ data: data || [] });
    }

    if (action === "get_order") {
      const id = String(payload.id || "");
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Order not found." }, 404);
    }

    if (action === "update_order") {
      const id = String(payload.id || "");
      const input = object(payload.update);
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status !== undefined) update.status = String(input.status);
      if (input.payment_status !== undefined) update.payment_status = String(input.payment_status);
      if (input.admin_notes !== undefined) update.admin_notes = String(input.admin_notes).slice(0, 4000);
      if (input.confirmed_total !== undefined) {
        update.confirmed_total = input.confirmed_total === null ? null : Number(input.confirmed_total);
      }
      if (input.pickup_date !== undefined) update.pickup_date = input.pickup_date || null;
      if (input.pickup_time !== undefined) update.pickup_time = input.pickup_time || null;
      if (input.pickup_location !== undefined) {
        update.pickup_location = String(input.pickup_location).trim().slice(0, 1000);
      }
      if (input.payment_instructions !== undefined) {
        update.payment_instructions = String(input.payment_instructions).trim().slice(0, 2000);
      }
      const { data, error } = await supabase
        .from("orders")
        .update(update)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Order not found." }, 404);
    }

    if (action === "create_quote") {
      const { data, error } = await supabase
        .from("quotes")
        .insert(cleanQuote(payload.quote))
        .select()
        .single();
      if (error) throw error;
      return json({ data });
    }

    if (action === "list_quotes") {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return json({ data: data || [] });
    }

    if (action === "get_quote") {
      const id = String(payload.id || "");
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Request not found." }, 404);
    }

    if (action === "update_quote") {
      const id = String(payload.id || "");
      const input = object(payload.update);
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.status !== undefined) update.status = String(input.status);
      if (input.payment_status !== undefined) update.payment_status = String(input.payment_status);
      if (input.admin_notes !== undefined) update.admin_notes = String(input.admin_notes).slice(0, 4000);
      if (input.confirmed_total !== undefined) {
        update.confirmed_total = input.confirmed_total === null ? null : Number(input.confirmed_total);
      }
      if (input.pickup_date !== undefined) update.pickup_date = input.pickup_date || null;
      if (input.pickup_time !== undefined) update.pickup_time = input.pickup_time || null;
      if (input.pickup_location !== undefined) {
        update.pickup_location = String(input.pickup_location).trim().slice(0, 1000);
      }
      if (input.payment_instructions !== undefined) {
        update.payment_instructions = String(input.payment_instructions).trim().slice(0, 2000);
      }
      const { data, error } = await supabase
        .from("quotes")
        .update(update)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Request not found." }, 404);
    }

    if (action === "subscribe") {
      const email = String(payload.email || "").trim().toLowerCase();
      const { error } = await supabase
        .from("subscribers")
        .upsert({ email, source: "site", updated_at: new Date().toISOString() }, {
          onConflict: "email",
          ignoreDuplicates: true,
        });
      if (error) throw error;
      return json({ data: { email } });
    }

    if (action === "list_pickup_locations") {
      const { data, error } = await supabase
        .from("pickup_locations")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("label", { ascending: true });
      if (error) throw error;
      return json({ data: data || [] });
    }

    if (action === "create_pickup_location") {
      const location = cleanPickupLocation(payload.location);
      if (Object.values(location).some((value) => typeof value === "string" && !value)) {
        return json({ error: "Every address field is required." }, 400);
      }
      const { data: last } = await supabase
        .from("pickup_locations")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data, error } = await supabase
        .from("pickup_locations")
        .insert({ ...location, sort_order: Number(last?.sort_order || 0) + 10 })
        .select()
        .single();
      if (error) throw error;
      return json({ data }, 201);
    }

    if (action === "update_pickup_location") {
      const id = String(payload.id || "");
      if (!/^\d+$/.test(id)) return json({ error: "Invalid pickup location." }, 400);
      const location = cleanPickupLocation(payload.location);
      if (Object.values(location).some((value) => typeof value === "string" && !value)) {
        return json({ error: "Every address field is required." }, 400);
      }
      const { data, error } = await supabase
        .from("pickup_locations")
        .update(location)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Pickup location not found." }, 404);
    }

    if (action === "delete_pickup_location") {
      const id = String(payload.id || "");
      if (!/^\d+$/.test(id)) return json({ error: "Invalid pickup location." }, 400);
      const { count, error: countError } = await supabase
        .from("pickup_locations")
        .select("id", { count: "exact", head: true });
      if (countError) throw countError;
      if ((count || 0) <= 1) return json({ error: "Keep at least one pickup location." }, 400);
      const { data, error } = await supabase
        .from("pickup_locations")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Pickup location not found." }, 404);
    }

    if (action === "list_products") {
      const { data, error } = await supabase.from("products").select("*")
        .order("sort_order", { ascending: true }).order("name", { ascending: true });
      if (error) throw error;
      return json({ data: data || [] });
    }

    if (action === "create_product") {
      const product = validateMenuProduct(payload.product);
      const { data, error } = await supabase.from("products").insert(product).select().single();
      if (error) throw error;
      return json({ data }, 201);
    }

    if (["update_product", "delete_product", "restore_product"].includes(action)) {
      const id = String(payload.id || "");
      const expected = String(payload.expectedUpdatedAt || "");
      if (!/^[1-9]\d*$/.test(id) || !Number.isFinite(Date.parse(expected))) return json({ error: "Refresh the menu before making changes." }, 400);
      const { data: current, error: readError } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (readError) throw readError;
      if (!current) return json({ error: "Menu item not found." }, 404);
      if (action === "update_product" && current.deleted_at) return json({ error: "Restore this item from Trash before editing it." }, 409);
      const update: Record<string, unknown> = action === "delete_product" ? { deleted_at: new Date().toISOString(), active: false }
        : action === "restore_product" ? { deleted_at: null, active: false }
        : validateMenuProduct(payload.product);
      // Keep the public URL stable even when the display name changes.
      if (action === "update_product" && update.slug !== current.slug) return json({ error: "The menu link cannot change after an item is created." }, 400);
      const { data, error } = await supabase.from("products")
        .update({ ...update, updated_at: new Date().toISOString() })
        .eq("id", id).eq("updated_at", expected).select().maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "This item changed in another window. Refresh the menu, then try again." }, 409);
    }

    if (action === "upload_menu_photo") {
      const contentType = String(payload.contentType || "");
      const base64 = String(payload.base64 || "");
      if (!["image/jpeg", "image/png", "image/webp"].includes(contentType) || !base64 || base64.length > Math.ceil(MENU_IMAGE_MAX_BYTES / 3) * 4) return json({ error: "Choose a JPG, PNG, or WebP photo under 5 MB." }, 400);
      const binary = atob(base64);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
      const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      const isWebp = new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
      if (!bytes.length || bytes.length > MENU_IMAGE_MAX_BYTES || !({ "image/png": isPng, "image/jpeg": isJpeg, "image/webp": isWebp }[contentType])) return json({ error: "The file is not a valid JPG, PNG, or WebP photo." }, 400);
      const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      const filePath = `flavors/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from(MENU_IMAGE_BUCKET).upload(filePath, bytes, { contentType, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(filePath);
      return json({ url: data.publicUrl }, 201);
    }

    if (action === "seed_products") {
      const products = Array.isArray(payload.products) ? payload.products.map(cleanProduct) : [];
      if (!products.length) return json({ error: "No products supplied." }, 400);

      const slugs = products.map((product) => product.slug);
      const { data: existing, error: readError } = await supabase
        .from("products")
        .select("slug")
        .in("slug", slugs);
      if (readError) throw readError;

      const existingSlugs = new Set((existing || []).map((row) => row.slug));
      const { data, error } = await supabase
        .from("products")
        .upsert(products, { onConflict: "slug", ignoreDuplicates: true })
        .select();
      if (error) throw error;

      const created = products.filter((product) => !existingSlugs.has(product.slug)).length;
      return json({ data: data || [], created, updated: 0 });
    }

    if (action === "record_receipt_failure") {
      const id = String(payload.id || "");
      if (!/^\d+$/.test(id)) return json({ error: "Invalid order." }, 400);
      const { error } = await supabase.from("orders")
        .update({ receipt_email_error: "The automatic receipt could not be sent. Check Gmail and retry the receipt." })
        .eq("id", id)
        .is("receipt_sent_at", null);
      if (error) throw error;
      return json({ ok: true });
    }

    if (action === "record_email") {
      const recordKind = String(payload.record_kind || "");
      const emailType = String(payload.email_type || "");
      const id = String(payload.record_id || "");
      if (!["orders", "quotes"].includes(recordKind) ||
          !["request_received", "confirmation", "status_update"].includes(emailType) ||
          (emailType === "request_received" && recordKind !== "orders") ||
          !/^\d+$/.test(id)) {
        return json({ error: "Invalid email event." }, 400);
      }

      const sentAt = new Date().toISOString();
      const event = {
        record_kind: recordKind,
        record_id: Number(id),
        order_number: String(payload.order_number || ""),
        email_type: emailType,
        recipient: String(payload.recipient || "").trim().toLowerCase(),
        subject: String(payload.subject || "").slice(0, 500),
        provider_message_id: String(payload.provider_message_id || "").slice(0, 1000),
        sent_at: sentAt,
      };
      const { error: eventError } = await supabase.from("email_events").insert(event);
      if (eventError) throw eventError;

      const timestampField = emailType === "request_received" ? "receipt_sent_at"
        : emailType === "confirmation" ? "confirmation_sent_at" : "last_update_sent_at";
      const update: Record<string, unknown> = { [timestampField]: sentAt, updated_at: sentAt };
      if (emailType === "request_received") update.receipt_email_error = "";
      const { data, error } = await supabase
        .from(recordKind)
        .update(update)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data ? json({ data }) : json({ error: "Record not found." }, 404);
    }

    return json({ error: "Unknown action." }, 400);
  } catch (error) {
    console.error("bonbons-data action failed", action, error);
    const message = error instanceof Error ? error.message : "Database operation failed.";
    const code = object(error).code;
    return json({ error: code === "23505" ? "That menu link or record already exists. Check hidden items and Trash, or use a different name." : message }, code === "23505" ? 409 : 400);
  }
});
