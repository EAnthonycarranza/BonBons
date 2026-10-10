import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callBonbonsAdmin } from "@/lib/supabase-data";
export const dynamic="force-dynamic";
export async function GET(request){const blocked=await menuGuard(request);if(blocked)return blocked;try{return NextResponse.json({subscribers:await callBonbonsAdmin("subscriber_list")},{headers:{"Cache-Control":"private, no-store"}});}catch(error){return menuError(error);}}
export async function PATCH(request){const blocked=await menuGuard(request,true);if(blocked)return blocked;try{const {id}=await request.json();if(!/^\d+$/.test(String(id)))throw new Error("Choose a subscriber.");await callBonbonsAdmin("subscriber_unsubscribe_admin",{id});return NextResponse.json({ok:true});}catch(error){return menuError(error);}}
