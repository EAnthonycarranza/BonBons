import { NextResponse } from "next/server";
import { menuGuard, menuError } from "@/lib/admin-menu";
import { callSupabaseData } from "@/lib/supabase-data";
import { MENU_IMAGE_MAX_BYTES } from "@/supabase/functions/_shared/menu";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const blocked = await menuGuard(request, true);
  if (blocked) return blocked;
  if (Number(request.headers.get("content-length")) > MENU_IMAGE_MAX_BYTES + 16384) {
    return NextResponse.json({ error: "Choose a photo under 5 MB." }, { status: 413 });
  }
  try {
    // Bound multipart parsing even for chunked requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MENU_IMAGE_MAX_BYTES + 16384) {
        await reader.cancel();
        return NextResponse.json({ error: "Choose a photo under 5 MB." }, { status: 413 });
      }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "content-type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("photo");
    if (!(file instanceof File) || !file.size || file.size > MENU_IMAGE_MAX_BYTES || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Choose a JPG, PNG, or WebP photo under 5 MB." }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const { url } = await callSupabaseData("upload_menu_photo", { contentType: file.type, base64: bytes.toString("base64") });
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) { return menuError(error); }
}
