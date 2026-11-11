/**
 * Grocery stores the weekly list can link to. Only public search and product-page URLs are used:
 * no private APIs, no scraping. Safe for client and server (no imports).
 */

export const GROCERY_STORE_IDS = ["ah", "jumbo", "blinkit", "zepto", "swiggy"] as const;
export type GroceryStore = (typeof GROCERY_STORE_IDS)[number];

export const DEFAULT_GROCERY_STORE: GroceryStore = "ah";

type StoreDef = {
  label: string;
  /** Short label for small buttons. */
  short: string;
  region: "Netherlands" | "India";
  search: (query: string) => string;
  /** Fallback when a search deep link is not usable. */
  home: string;
  /** Accepted hostnames (apex or any subdomain). */
  hosts: string[];
  /** Pathname of a product page (query and hash are dropped before matching). */
  productPath: RegExp;
  /** Shown as a hint when a pasted link is rejected. */
  productExample: string;
};

export const GROCERY_STORES: Record<GroceryStore, StoreDef> = {
  ah: {
    label: "Albert Heijn",
    short: "AH",
    region: "Netherlands",
    search: (q) => `https://www.ah.nl/zoeken?query=${encodeURIComponent(q)}`,
    home: "https://www.ah.nl/",
    hosts: ["ah.nl"],
    productPath: /^\/producten\/product\/wi\d+(\/[^/]+)?\/?$/i,
    productExample: "ah.nl/producten/product/wi441199/…",
  },
  jumbo: {
    label: "Jumbo",
    short: "Jumbo",
    region: "Netherlands",
    search: (q) => `https://www.jumbo.com/producten/?searchTerms=${encodeURIComponent(q)}`,
    home: "https://www.jumbo.com/",
    hosts: ["jumbo.com"],
    // A single slug that contains the product code (digits), unlike category pages.
    productPath: /^\/producten\/[^/]*\d[^/]*\/?$/i,
    productExample: "jumbo.com/producten/jumbo-halfvolle-melk-1l-12345BAK",
  },
  blinkit: {
    label: "Blinkit",
    short: "Blinkit",
    region: "India",
    search: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    home: "https://blinkit.com/",
    hosts: ["blinkit.com"],
    productPath: /^\/prn\/[^/]+\/prid\/\d+\/?$/i,
    productExample: "blinkit.com/prn/amul-gold-milk/prid/14639",
  },
  zepto: {
    label: "Zepto",
    short: "Zepto",
    region: "India",
    search: (q) => `https://www.zepto.com/search?query=${encodeURIComponent(q)}`,
    home: "https://www.zepto.com/",
    hosts: ["zepto.com", "zeptonow.com"],
    productPath: /^\/pn\/[^/]+\/pvid\/[0-9a-f-]{36}\/?$/i,
    productExample: "zepto.com/pn/onion/pvid/…",
  },
  swiggy: {
    label: "Swiggy Instamart",
    short: "Instamart",
    region: "India",
    search: (q) => `https://www.swiggy.com/instamart/search?custom_back=true&query=${encodeURIComponent(q)}`,
    home: "https://www.swiggy.com/instamart",
    hosts: ["swiggy.com"],
    productPath: /^\/instamart\/item\/[A-Za-z0-9]+\/?$/,
    productExample: "swiggy.com/instamart/item/8XUTKS0CZ3",
  },
};

export function isGroceryStore(v: unknown): v is GroceryStore {
  return typeof v === "string" && (GROCERY_STORE_IDS as readonly string[]).includes(v);
}

export function storeSearchUrl(store: GroceryStore, name: string): string {
  return GROCERY_STORES[store].search(name.trim());
}

/** First URL in pasted text (share sheets often add "Check this out: …"), or the trimmed text. */
function extractUrl(input: string): string {
  const m = input.match(/https?:\/\/[^\s<>"']+/i);
  return (m ? m[0] : input).trim();
}

/**
 * Validates a pasted product link for a store and returns a clean https URL
 * (tracking query/hash removed), or null when it is not a product page on that store's domain.
 */
export function normalizeProductUrl(store: GroceryStore, input: string): string | null {
  if (typeof input !== "string" || input.length > 2000) return null;
  let text = extractUrl(input);
  if (!text) return null;
  // Allow "www.ah.nl/producten/…" without a scheme.
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) text = `https://${text}`;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  const def = GROCERY_STORES[store];
  if (!def.hosts.some((h) => host === h || host.endsWith(`.${h}`))) return null;
  if (!def.productPath.test(url.pathname)) return null;
  const clean = `https://${host}${url.pathname}`;
  return clean.length <= 500 ? clean : null;
}

/** Default store from the user's locale: Indian time zone or an -IN locale picks India, else Albert Heijn. */
export function inferGroceryStore(opts: { timeZone?: string; language?: string }): GroceryStore {
  const tz = opts.timeZone ?? "";
  const lang = opts.language ?? "";
  if (/^Asia\/(Kolkata|Calcutta)$/i.test(tz) || /[-_]IN$/i.test(lang)) return "blinkit";
  return DEFAULT_GROCERY_STORE;
}
