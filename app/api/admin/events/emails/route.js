import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { validateEventEmail } from "@/lib/events";
import { hasEmailConfiguration } from "@/lib/email";
export const dynamic="force-dynamic";
export async function GET(request){const blocked=await menuGuard(request);if(blocked)return blocked;try{return NextResponse.json({campaigns:await callBonbonsAdmin("event_campaign_list"),emailConfigured:hasEmailConfiguration()},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return menuError(error);}}
export async function POST(request){const blocked=await menuGuard(request,true);if(blocked)return blocked;try{const body=await request.json();if(body.id&&!/^\d+$/.test(String(body.id)))throw new Error("Choose an email draft.");const campaign=await callBonbonsAdmin("event_campaign_save",{id:body.id||null,design:validateEventEmail(body.design)});return NextResponse.json({campaign});}catch(error){return menuError(error);}}
