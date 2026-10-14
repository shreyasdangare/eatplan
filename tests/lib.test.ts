import { afterEach, describe, expect, it, vi } from "vitest";
import { isMealPast } from "@/lib/isMealPast";
import { getCategoryEmoji, getCategoryDisplayName, getItemEmoji, inferCategoryFromName } from "@/lib/categoryEmoji";
import { getTranslatedTagline, getTranslatedWelcome } from "@/lib/taglines";

describe("isMealPast", () => {
  afterEach(() => vi.useRealTimers());
  it("returns false for bad input", () => {
    expect(isMealPast("", "lunch")).toBe(false);
    expect(isMealPast("2026-10", "lunch")).toBe(false);
  });
  it("uses slot cut-off times", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 14, 16, 0));
    expect(isMealPast("2026-10-14", "breakfast")).toBe(true);
    expect(isMealPast("2026-10-14", "lunch")).toBe(true);
    expect(isMealPast("2026-10-14", "dinner")).toBe(false);
    expect(isMealPast("2026-10-15", "breakfast")).toBe(false);
  });
});

describe("categoryEmoji", () => {
  it("maps known and unknown categories", () => {
    expect(getCategoryEmoji("Dairy")).toBe("🥛");
    expect(getCategoryEmoji("nope")).toBe("🛒");
    expect(getCategoryEmoji(null)).toBe("🛒");
    expect(getCategoryDisplayName("  ")).toBe("Other");
  });
  it("infers categories from names", () => {
    expect(inferCategoryFromName("Whole milk")).toBe("Dairy");
    expect(inferCategoryFromName("chicken thighs")).toBe("Meat & Fish");
    expect(inferCategoryFromName("xyz")).toBeNull();
    expect(getItemEmoji(null, "salmon")).toBe(getCategoryEmoji("Meat & Fish"));
  });
});

describe("taglines", () => {
  it("translates and falls back to English", () => {
    expect(getTranslatedTagline()).toBe("What to eat?");
    expect(getTranslatedTagline("Hindi")).toBe("क्या खाएं?");
    expect(getTranslatedTagline("klingon")).toBe("What to eat?");
    expect(getTranslatedWelcome("en", true)).toBe("Welcome,");
  });
});
