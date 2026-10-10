import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
import { hasEmailConfiguration } from "@/lib/email";
import { processEventEmailBatch } from "@/lib/event-mailing";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request,{params}){const blocked=await menuGuard(request);if(blocked)return blocked;try{const {id}=await params;if(!/^\d+$/.test(id))throw new Error("Choose an email update.");return NextResponse.json({progress:await callBonbonsAdmin("event_campaign_status",{id})},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return menuError(error);}}
export async function POST(request,{params}){
 const blocked=await menuGuard(request,true);if(blocked)return blocked;
 if(!hasEmailConfiguration())return NextResponse.json({error:"Connect Gmail in Shop settings before sending."},{status:503});
 try{const {id}=await params;if(!/^\d+$/.test(id))throw new Error("Choose an email update.");const body=await request.json();if(body.action==="begin")await callBonbonsAdmin("event_campaign_begin",{id});else if(body.action==="retry"&&body.reviewed===true)await callBonbonsAdmin("event_campaign_retry",{id});else if(body.action!=="process")throw new Error("Choose a send action.");return NextResponse.json({progress:await processEventEmailBatch(id)},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return menuError(error);}
}
