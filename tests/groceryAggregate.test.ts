import { describe, expect, it } from "vitest";
import {
  aggregateGroceries,
  groceryListToText,
  ahSearchUrl,
  jumboSearchUrl,
  normalizeUnit,
} from "@/lib/groceryAggregate";

describe("aggregateGroceries", () => {
  it("sums same ingredient with compatible mass units and converts to kg", () => {
    const g = aggregateGroceries([
      { ingredient_id: "a", name: "Flour", category: "Baking", amount: 500, unit: "g" },
      { ingredient_id: "a", name: "Flour", category: "Baking", amount: 1, unit: "kg" },
    ]);
    expect(g).toEqual([{ category: "Baking", items: [{ key: "a", name: "Flour", category: "Baking", quantities: ["1.5 kg"] }] }]);
  });

  it("sums volumes and spoons", () => {
    const [grp] = aggregateGroceries([
      { ingredient_id: "m", name: "Milk", amount: 250, unit: "ml" },
      { ingredient_id: "m", name: "Milk", amount: 0.5, unit: "L" },
      { ingredient_id: "o", name: "Oil", amount: 1, unit: "tbsp" },
      { ingredient_id: "o", name: "Oil", amount: 3, unit: "tsp" },
    ]);
    expect(grp.items.find((i) => i.key === "m")!.quantities).toEqual(["750 ml"]);
    expect(grp.items.find((i) => i.key === "o")!.quantities).toEqual(["2 tbsp"]);
  });

  it("keeps incompatible units separate", () => {
    const [grp] = aggregateGroceries([
      { ingredient_id: "t", name: "Tomato", amount: 2, unit: "" },
      { ingredient_id: "t", name: "Tomato", amount: 400, unit: "g" },
      { ingredient_id: "t", name: "Tomato", amount: 1, unit: "can" },
      { ingredient_id: "t", name: "Tomato", amount: 1, unit: "can" },
      { ingredient_id: "t", name: "Tomato", amount: 3, unit: "pcs" },
    ]);
    expect(grp.items[0].quantities).toEqual(["400 g", "5", "2 can"]);
  });

  it("keeps free-text quantities, deduplicated, and handles missing amounts", () => {
    const [grp] = aggregateGroceries([
      { ingredient_id: "s", name: "Salt", quantity: "a pinch" },
      { ingredient_id: "s", name: "Salt", quantity: "a pinch" },
      { ingredient_id: "p", name: "Pepper" },
    ]);
    expect(grp.items.map((i) => i.quantities)).toEqual([[], ["a pinch"]]);
  });

  it("falls back to case-insensitive name when ingredient id is missing", () => {
    const [grp] = aggregateGroceries([
      { name: "Onion", amount: 1 },
      { name: "onion ", amount: 2 },
    ]);
    expect(grp.items).toHaveLength(1);
    expect(grp.items[0].quantities).toEqual(["3"]);
  });

  it("groups by category alphabetically with Other last", () => {
    const g = aggregateGroceries([
      { name: "X", amount: 1 },
      { name: "Milk", category: "Dairy", amount: 1, unit: "l" },
      { name: "Apple", category: "Fruit", amount: 2 },
    ]);
    expect(g.map((x) => x.category)).toEqual(["Dairy", "Fruit", "Other"]);
  });

  it("returns empty for no rows", () => {
    expect(aggregateGroceries([])).toEqual([]);
  });
});

describe("helpers", () => {
  it("normalizes units", () => {
    expect(normalizeUnit("KG")).toEqual({ family: "mass", factor: 1000 });
    expect(normalizeUnit("bunch")).toBeNull();
  });
  it("builds plain text", () => {
    const text = groceryListToText(
      aggregateGroceries([{ name: "Milk", category: "Dairy", amount: 1, unit: "l" }, { name: "Salt" }]),
      "Groceries"
    );
    expect(text).toBe("Groceries\n\nDairy:\n- Milk (1 l)\n\nOther:\n- Salt");
  });
  it("builds encoded store search URLs", () => {
    expect(ahSearchUrl("crème fraîche")).toBe("https://www.ah.nl/zoeken?query=cr%C3%A8me%20fra%C3%AEche");
    expect(jumboSearchUrl("red onion")).toBe("https://www.jumbo.com/producten/?searchTerms=red%20onion");
  });
});
