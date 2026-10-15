/* eslint-disable @next/next/no-img-element -- optimised in phase 3 */
/** Recipe photo filling its (positioned) parent. */
export function RecipeImage({
  src,
  alt,
  priority,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
