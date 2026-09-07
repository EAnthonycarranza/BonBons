import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { callSupabaseData, hasSupabaseDatabase, toPickupLocation } from "@/lib/supabase-data";

export const dynamic = "force-dynamic";

function cleanLocation(body) {
  return {
    label: String(body.label || "").trim().slice(0, 80),
    street_address: String(body.streetAddress || "").trim().slice(0, 200),
    city: String(body.city || "").trim().slice(0, 100),
    state: String(body.state || "").trim().slice(0, 100),
    postal_code: String(body.postalCode || "").trim().slice(0, 20),
    country: String(body.country || "").trim().slice(0, 100),
  };
}

function validateLocation(location) {
  if (Object.values(location).some((value) => !value)) return "Every address field is required.";
  if (!/^[A-Za-z0-9][A-Za-z0-9 -]{2,19}$/.test(location.postal_code)) return "Enter a valid ZIP or postal code.";
  return "";
}

async function guard() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  if (!hasSupabaseDatabase()) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  return null;
}

async function listLocations() {
  const { data } = await callSupabaseData("list_pickup_locations");
  return (data || []).map(toPickupLocation);
}

export async function GET() {
  const blocked = await guard();
  if (blocked) return blocked;
  try {
    return NextResponse.json({ locations: await listLocations() });
  } catch (error) {
    console.error("Pickup-location read failed:", error.message);
    return NextResponse.json({ error: "Could not load pickup locations." }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const location = cleanLocation(await request.json().catch(() => ({})));
  const errorMessage = validateLocation(location);
  if (errorMessage) return NextResponse.json({ error: errorMessage }, { status: 400 });
  try {
    await callSupabaseData("create_pickup_location", { location });
    return NextResponse.json({ locations: await listLocations() }, { status: 201 });
  } catch (error) {
    console.error("Pickup-location create failed:", error.message);
    return NextResponse.json({ error: error.message === "That record already exists." ? "That pickup address is already saved." : "Could not add this pickup location." }, { status: 400 });
  }
}

export async function PATCH(request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid pickup location." }, { status: 400 });
  const location = cleanLocation(body);
  const errorMessage = validateLocation(location);
  if (errorMessage) return NextResponse.json({ error: errorMessage }, { status: 400 });
  try {
    await callSupabaseData("update_pickup_location", { id, location });
    return NextResponse.json({ locations: await listLocations() });
  } catch (error) {
    console.error("Pickup-location update failed:", error.message);
    return NextResponse.json({ error: error.message === "That record already exists." ? "That pickup address is already saved." : "Could not update this pickup location." }, { status: 400 });
  }
}

export async function DELETE(request) {
  const blocked = await guard();
  if (blocked) return blocked;
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "Invalid pickup location." }, { status: 400 });
  try {
    await callSupabaseData("delete_pickup_location", { id });
    return NextResponse.json({ locations: await listLocations() });
  } catch (error) {
    console.error("Pickup-location delete failed:", error.message);
    return NextResponse.json({ error: error.message || "Could not delete this pickup location." }, { status: 400 });
  }
}
