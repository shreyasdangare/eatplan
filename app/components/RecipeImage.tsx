"use client";
/* eslint-disable @next/next/no-img-element -- sized variants come from the source CDNs (see lib/imageSrc) */
import { useState } from "react";
import { responsiveImage } from "@/lib/imageSrc";

/** Recipe photo filling its (positioned) parent, with a responsive srcset and a fallback to the original. */
export function RecipeImage({
  src,
  alt,
  sizes,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const r = failed ? { src } : responsiveImage(src);
  return (
    <img
      src={r.src}
      srcSet={r.srcSet}
      sizes={r.srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      onError={() => !failed && setFailed(true)}
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
