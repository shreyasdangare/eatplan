import { describe, expect, it } from "vitest";
import { formatDuration, normalizeAudioMime, normalizeRecipe, normalizeUnit, parseAmount, parseVoiceResult, pickRecorderMime } from "../lib/voiceRecipe";

describe("audio mime", () => {
  it("strips codecs and maps aliases", () => {
    expect(normalizeAudioMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeAudioMime("audio/mp4; codecs=mp4a.40.2")).toBe("audio/mp4");
    expect(normalizeAudioMime("audio/x-m4a")).toBe("audio/mp4");
    expect(normalizeAudioMime("video/webm")).toBe("audio/webm");
    expect(normalizeAudioMime("image/png")).toBeNull();
    expect(normalizeAudioMime(undefined)).toBeNull();
  });
  it("picks the first supported recorder type", () => {
    expect(pickRecorderMime((t) => t.startsWith("audio/mp4"))).toBe("audio/mp4;codecs=mp4a.40.2");
    expect(pickRecorderMime(() => false)).toBeUndefined();
    expect(pickRecorderMime(() => { throw new Error("x"); })).toBeUndefined();
  });
});

describe("amounts and units", () => {
  it("parses fractions", () => {
    expect(parseAmount("1/2")).toBe(0.5);
    expect(parseAmount("1 1/2")).toBe(1.5);
    expect(parseAmount("1½")).toBe(1.5);
    expect(parseAmount(2)).toBe(2);
    expect(parseAmount("to taste")).toBeUndefined();
    expect(parseAmount(0)).toBeUndefined();
    expect(parseAmount("1/0")).toBeUndefined();
  });
  it("normalises units incl. Indian kitchen words", () => {
    expect(normalizeUnit("Teaspoons")).toBe("tsp");
    expect(normalizeUnit("katori")).toBe("cup");
    expect(normalizeUnit("gms")).toBe("g");
    expect(normalizeUnit("chutki")).toBe("pinch");
    expect(normalizeUnit("sprig")).toBe("sprig");
    expect(normalizeUnit("")).toBeUndefined();
    expect(normalizeUnit(null)).toBeUndefined();
  });
});

describe("normalizeRecipe", () => {
  it("cleans and dedupes ingredients", () => {
    const r = normalizeRecipe({
      name: "  Kanda Poha ",
      servings: "2",
      prep_time_minutes: 20,
      ingredients: [
        { name: "Poha", quantity: "", amount: "2", unit: "cups" },
        { name: "poha", amount: 1 },
        "Salt",
        { name: "", amount: 1 },
        { name: "Turmeric (haldi)", quantity: "1/2 tsp", amount: 0.5, unit: "teaspoon" },
      ],
      instructions: "1. Rinse poha.",
    });
    expect(r.name).toBe("Kanda Poha");
    expect(r.servings).toBe(2);
    expect(r.ingredients).toEqual([
      { name: "Poha", quantity: "2 cup", amount: 2, unit: "cup" },
      { name: "Salt" },
      { name: "Turmeric (haldi)", quantity: "1/2 tsp", amount: 0.5, unit: "tsp" },
    ]);
  });
  it("drops bad numbers", () => {
    const r = normalizeRecipe({ name: "X", servings: -1, prep_time_minutes: "abc", ingredients: ["a"], instructions: "" });
    expect(r.servings).toBeUndefined();
    expect(r.prep_time_minutes).toBeUndefined();
  });
  it("rejects unusable input", () => {
    expect(() => normalizeRecipe(null)).toThrow();
    expect(() => normalizeRecipe({ name: "", ingredients: ["a"] })).toThrow();
    expect(() => normalizeRecipe({ name: "Dal", ingredients: [], instructions: " " })).toThrow();
  });
});

describe("parseVoiceResult", () => {
  it("returns recipe and transcript", () => {
    const v = parseVoiceResult({ transcript: "poha banane ke liye...", language: "mixed", name: "Poha", ingredients: ["Poha"], instructions: "1. Cook" });
    expect(v.transcript).toMatch(/poha/);
    expect(v.language).toBe("mixed");
    expect(v.recipe.name).toBe("Poha");
  });
  it("gives friendly errors", () => {
    expect(() => parseVoiceResult({ transcript: "hello there", name: "" })).toThrow(/couldn't find a recipe/);
    expect(() => parseVoiceResult({})).toThrow(/couldn't hear/);
    expect(() => parseVoiceResult({ speech_detected: false, transcript: "x", name: "Chai", ingredients: ["Tea"] })).toThrow(/couldn't hear/);
  });
});

it("formats durations", () => {
  expect(formatDuration(0)).toBe("0:00");
  expect(formatDuration(605.7)).toBe("10:05");
});
