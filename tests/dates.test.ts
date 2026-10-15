import { describe, expect, it } from "vitest";
import { addDays, currentSlot, relativeDayLabel, toISODate, weekStartOf } from "@/lib/dates";

describe("dates helpers", () => {
  it("formats local ISO dates", () => {
    expect(toISODate(new Date(2026, 9, 5))).toBe("2026-10-05");
  });
  it("finds Monday as week start (Sunday belongs to previous week)", () => {
    expect(toISODate(weekStartOf(new Date(2026, 9, 15)))).toBe("2026-10-12");
    expect(toISODate(weekStartOf(new Date(2026, 9, 18)))).toBe("2026-10-12");
    expect(toISODate(weekStartOf(new Date(2026, 9, 19)))).toBe("2026-10-19");
  });
  it("labels relative days", () => {
    expect(relativeDayLabel("2026-10-15", "2026-10-15")).toBe("Today");
    expect(relativeDayLabel("2026-10-16", "2026-10-15")).toBe("Tomorrow");
    expect(relativeDayLabel("2026-10-17", "2026-10-15")).toMatch(/Sat/);
  });
  it("adds days across month ends", () => {
    expect(toISODate(addDays(new Date(2026, 9, 31), 1))).toBe("2026-11-01");
  });
  it("picks the upcoming meal slot", () => {
    expect(currentSlot(new Date(2026, 9, 15, 8))).toBe("breakfast");
    expect(currentSlot(new Date(2026, 9, 15, 12))).toBe("lunch");
    expect(currentSlot(new Date(2026, 9, 15, 19))).toBe("dinner");
  });
});
