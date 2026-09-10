"use client";

import Image from "next/image";
import { useState } from "react";

export default function WeeklyBoxPosterImage({ src, alt, priority }) {
  const [fallbackSrc, setFallbackSrc] = useState(null);
  // A newly uploaded flyer may not reach the image optimizer before its timeout.
  // Keep the announcement visible by retrying its original public Storage URL.
  return <Image src={src} alt={alt} fill priority={priority} quality={90}
    sizes="(max-width:760px) 92vw, 540px" unoptimized={fallbackSrc === src}
    onError={() => setFallbackSrc(src)} />;
}
