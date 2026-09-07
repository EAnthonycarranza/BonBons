import Image from "next/image";
import { savedCartPhoto } from "@/lib/product-photos";
import { isMenuImageUrl } from "@/supabase/functions/_shared/menu";

// Resolve older saved request items too; they predate image metadata.
export default function ProductThumbnail({ item }) {
  const candidate = savedCartPhoto(item);
  const src = isMenuImageUrl(candidate) ? candidate : "/logo-transparent.png";
  return <Image src={src} alt="" fill sizes="76px" />;
}
