import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/safeNext";

describe("safeNextPath", () => {
  it("allows same-origin paths", () => {
    expect(safeNextPath("/plan")).toBe("/plan");
    expect(safeNextPath("/dishes/1?x=2")).toBe("/dishes/1?x=2");
  });
  it("blocks open redirects", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "https://evil.com", "@evil.com", "evil", "/\nfoo", null, undefined, ""]) {
      expect(safeNextPath(bad as string)).toBe("/");
    }
  });
});
