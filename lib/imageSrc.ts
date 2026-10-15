/**
 * Responsive variants for recipe photos without using a paid image optimiser:
 * the hosts we store images from (Wikimedia, Spoonacular, Unsplash) all serve
 * resized copies themselves. Unknown hosts fall back to the original URL.
 */
const WIKI_WIDTHS = [250, 330, 500, 960, 1280];
const SPOON_SIZES = ["240x150", "312x231", "480x360", "636x393"] as const;

export function imageVariant(src: string, width: number): string | null {
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return null;
  }
  if (u.hostname === "upload.wikimedia.org") {
    const t = u.pathname.match(/^(\/wikipedia\/[^/]+\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+))\/\d+px-([^/]+)$/);
    if (t) return `https://upload.wikimedia.org${t[1]}/${width}px-${t[3]}`;
    const m = u.pathname.match(/^\/wikipedia\/([^/]+)\/(?!thumb\/)([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/);
    if (!m) return null;
    const [, project, a, ab, file] = m;
    if (/\.(svg|tiff?|gif)$/i.test(file)) return null;
    return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${a}/${ab}/${file}/${width}px-${file}`;
  }
  if (u.hostname === "img.spoonacular.com") {
    const m = u.pathname.match(/^(\/recipes\/\d+)-\d+x\d+\.(jpg|jpeg|png)$/i);
    if (!m) return null;
    const size = SPOON_SIZES.find((s) => Number(s.split("x")[0]) >= width) ?? SPOON_SIZES[SPOON_SIZES.length - 1];
    return `https://img.spoonacular.com${m[1]}-${size}.${m[2]}`;
  }
  if (u.hostname === "images.unsplash.com") {
    u.searchParams.set("w", String(width));
    u.searchParams.set("q", "70");
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    return u.toString();
  }
  return null;
}

export function responsiveImage(src: string, widths = WIKI_WIDTHS): { src: string; srcSet?: string } {
  const variants = widths
    .map((w) => [w, imageVariant(src, w)] as const)
    .filter((v): v is readonly [number, string] => !!v[1]);
  if (variants.length === 0) return { src };
  const seen = new Set<string>();
  const srcSet = variants
    .filter(([, url]) => (seen.has(url) ? false : (seen.add(url), true)))
    .map(([w, url]) => `${url} ${w}w`)
    .join(", ");
  return { src: variants[Math.min(2, variants.length - 1)][1], srcSet };
}
