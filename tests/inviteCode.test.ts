import { describe, expect, it } from "vitest";
import { generateInviteCode, normalizeInviteCode } from "@/lib/inviteCode";

describe("invite codes", () => {
  it("generates 8 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) expect(generateInviteCode()).toMatch(/^[A-HJKMNP-Z2-9]{8}$/);
  });
  it("is not constant", () => {
    expect(new Set(Array.from({ length: 50 }, () => generateInviteCode())).size).toBeGreaterThan(45);
  });
  it("normalizes user input", () => {
    expect(normalizeInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
  });
});
