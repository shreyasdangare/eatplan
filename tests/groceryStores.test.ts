import { describe, expect, it } from "vitest";
import {
  GROCERY_STORE_IDS,
  inferGroceryStore,
  isGroceryStore,
  normalizeProductUrl,
  storeSearchUrl,
} from "@/lib/groceryStores";

describe("storeSearchUrl", () => {
  it("builds encoded public search URLs for every store", () => {
    expect(storeSearchUrl("ah", "crème fraîche")).toBe("https://www.ah.nl/zoeken?query=cr%C3%A8me%20fra%C3%AEche");
    expect(storeSearchUrl("jumbo", "red onion")).toBe("https://www.jumbo.com/producten/?searchTerms=red%20onion");
    expect(storeSearchUrl("blinkit", "paneer")).toBe("https://blinkit.com/s/?q=paneer");
    expect(storeSearchUrl("zepto", "basmati rice")).toBe("https://www.zepto.com/search?query=basmati%20rice");
    expect(storeSearchUrl("swiggy", "atta & dal")).toBe(
      "https://www.swiggy.com/instamart/search?custom_back=true&query=atta%20%26%20dal"
    );
  });
  it("encodes characters that could break out of the query", () => {
    expect(storeSearchUrl("ah", "a&b=c#d")).toBe("https://www.ah.nl/zoeken?query=a%26b%3Dc%23d");
  });
});

describe("normalizeProductUrl", () => {
  const good: [Parameters<typeof normalizeProductUrl>[0], string, string][] = [
    ["ah", "https://www.ah.nl/producten/product/wi441199/campina-halfvolle-melk?utm_source=x#top", "https://www.ah.nl/producten/product/wi441199/campina-halfvolle-melk"],
    ["ah", "ah.nl/producten/product/wi441199", "https://ah.nl/producten/product/wi441199"],
    ["jumbo", "https://www.jumbo.com/producten/jumbo-halfvolle-melk-1l-170012BAK/", "https://www.jumbo.com/producten/jumbo-halfvolle-melk-1l-170012BAK/"],
    ["blinkit", "https://blinkit.com/prn/amul-gold-milk/prid/14639", "https://blinkit.com/prn/amul-gold-milk/prid/14639"],
    ["zepto", "https://www.zepto.com/pn/onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071?x=1", "https://www.zepto.com/pn/onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071"],
    ["swiggy", "https://www.swiggy.com/instamart/item/8XUTKS0CZ3?storeId=1", "https://www.swiggy.com/instamart/item/8XUTKS0CZ3"],
  ];
  it.each(good)("accepts a %s product link", (store, input, expected) => {
    expect(normalizeProductUrl(store, input)).toBe(expected);
  });

  it("extracts the link from shared text", () => {
    expect(normalizeProductUrl("ah", "Kijk eens: https://www.ah.nl/producten/product/wi230720/ah-frikandelbroodje bedankt")).toBe(
      "https://www.ah.nl/producten/product/wi230720/ah-frikandelbroodje"
    );
  });

  it("rejects the wrong store's domain", () => {
    expect(normalizeProductUrl("ah", "https://www.jumbo.com/producten/jumbo-melk-1l-12345BAK")).toBeNull();
    expect(normalizeProductUrl("blinkit", "https://www.zepto.com/pn/onion/pvid/5b5c1960-d2d1-4528-8a74-bc7280174071")).toBeNull();
  });

  it("rejects look-alike hosts, credentials, ports and other schemes", () => {
    expect(normalizeProductUrl("ah", "https://ah.nl.evil.com/producten/product/wi1/x")).toBeNull();
    expect(normalizeProductUrl("ah", "https://notah.nl/producten/product/wi1/x")).toBeNull();
    expect(normalizeProductUrl("ah", "https://user:pw@www.ah.nl/producten/product/wi1/x")).toBeNull();
    expect(normalizeProductUrl("ah", "https://www.ah.nl:8443/producten/product/wi1/x")).toBeNull();
    expect(normalizeProductUrl("ah", "javascript:alert(1)")).toBeNull();
    expect(normalizeProductUrl("ah", "ftp://www.ah.nl/producten/product/wi1/x")).toBeNull();
  });

  it("rejects non-product pages on the right domain", () => {
    expect(normalizeProductUrl("ah", "https://www.ah.nl/zoeken?query=melk")).toBeNull();
    expect(normalizeProductUrl("ah", "https://www.ah.nl/")).toBeNull();
    expect(normalizeProductUrl("jumbo", "https://www.jumbo.com/producten/aardappelen,-groente-en-fruit/")).toBeNull();
    expect(normalizeProductUrl("blinkit", "https://blinkit.com/s/?q=paneer")).toBeNull();
    expect(normalizeProductUrl("swiggy", "https://www.swiggy.com/instamart/search?query=milk")).toBeNull();
  });

  it("rejects empty, garbage and over-long input", () => {
    expect(normalizeProductUrl("ah", "")).toBeNull();
    expect(normalizeProductUrl("ah", "   ")).toBeNull();
    expect(normalizeProductUrl("ah", "not a url")).toBeNull();
    expect(normalizeProductUrl("ah", "https://www.ah.nl/producten/product/wi1/" + "a".repeat(600))).toBeNull();
  });
});

describe("inferGroceryStore", () => {
  it("picks an India store for Indian time zones and -IN locales", () => {
    expect(inferGroceryStore({ timeZone: "Asia/Kolkata", language: "en-US" })).toBe("blinkit");
    expect(inferGroceryStore({ timeZone: "Asia/Calcutta" })).toBe("blinkit");
    expect(inferGroceryStore({ timeZone: "Europe/Amsterdam", language: "en-IN" })).toBe("blinkit");
    expect(inferGroceryStore({ language: "hi_IN" })).toBe("blinkit");
  });
  it("defaults to Albert Heijn otherwise", () => {
    expect(inferGroceryStore({ timeZone: "Europe/Amsterdam", language: "nl-NL" })).toBe("ah");
    expect(inferGroceryStore({ language: "hi" })).toBe("ah");
    expect(inferGroceryStore({})).toBe("ah");
  });
});

describe("isGroceryStore", () => {
  it("only accepts known ids", () => {
    for (const id of GROCERY_STORE_IDS) expect(isGroceryStore(id)).toBe(true);
    expect(isGroceryStore("bigbasket")).toBe(false);
    expect(isGroceryStore(undefined)).toBe(false);
  });
});
