import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validateEvent, eventToRow, toEvent } from "@/lib/events";
export const dynamic = "force-dynamic";
export async function GET(request) {
  const blocked=await menuGuard(request);if(blocked)return blocked;
  try { return NextResponse.json({events:(await callBonbonsAdmin("event_list")).map(toEvent)},{headers:{"Cache-Control":"private, no-store"}}); } catch(error){return menuError(error);}
}
export async function POST(request) {
  const blocked=await menuGuard(request,true);if(blocked)return blocked;
  try { const body=await request.json(); if(body.id && !/^\d+$/.test(String(body.id)))throw new Error("Choose a valid event."); const payload=eventToRow(validateEvent(body));const row=await callBonbonsAdmin("event_save",{...payload,id:body.id||null});return NextResponse.json({event:toEvent(row)},{status:body.id?200:201}); }catch(error){return menuError(error);}
}
