import { describe, expect, it } from "vitest";
import { imageVariant, responsiveImage } from "../lib/imageSrc";

describe("imageVariant", () => {
  it("builds wikimedia thumbs", () => {
    expect(imageVariant("https://upload.wikimedia.org/wikipedia/commons/a/ab/Dal_Fry.jpg", 330)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Dal_Fry.jpg/330px-Dal_Fry.jpg"
    );
  });
  it("re-sizes existing wikimedia thumbs", () => {
    expect(imageVariant("https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/K.jpg/960px-K.jpg", 330)).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/K.jpg/330px-K.jpg"
    );
  });
  it("resizes spoonacular", () => {
    expect(imageVariant("https://img.spoonacular.com/recipes/123-556x370.jpg", 300)).toBe(
      "https://img.spoonacular.com/recipes/123-312x231.jpg"
    );
  });
  it("leaves unknown hosts alone", () => {
    expect(responsiveImage("https://x.supabase.co/storage/v1/a.jpg")).toEqual({ src: "https://x.supabase.co/storage/v1/a.jpg" });
  });
});
