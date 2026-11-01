/**
 * Pure aggregation for the weekly grocery list: merges ingredients across planned meals.
 * Same ingredient + compatible units are summed (g/kg, ml/l, tsp/tbsp, pieces);
 * incompatible units and free-text quantities are kept as separate entries.
 */

export type GroceryInputRow = {
  ingredient_id?: string | null;
  name: string;
  category?: string | null;
  amount?: number | null;
  unit?: string | null;
  /** Free-text quantity, used when amount/unit are missing (e.g. "a pinch"). */
  quantity?: string | null;
};

export type GroceryItem = {
  key: string;
  name: string;
  category: string;
  /** Display quantities, e.g. ["1.5 kg", "2 cups", "a pinch"]. Empty when unknown. */
  quantities: string[];
};

export type GroceryGroup = { category: string; items: GroceryItem[] };

type Family = "mass" | "volume" | "spoon" | "count";

const UNIT_MAP: Record<string, { family: Family; factor: number }> = {
  mg: { family: "mass", factor: 0.001 },
  g: { family: "mass", factor: 1 },
  gr: { family: "mass", factor: 1 },
  gram: { family: "mass", factor: 1 },
  grams: { family: "mass", factor: 1 },
  kg: { family: "mass", factor: 1000 },
  kilo: { family: "mass", factor: 1000 },
  kilogram: { family: "mass", factor: 1000 },
  kilograms: { family: "mass", factor: 1000 },
  ml: { family: "volume", factor: 1 },
  cl: { family: "volume", factor: 10 },
  dl: { family: "volume", factor: 100 },
  l: { family: "volume", factor: 1000 },
  liter: { family: "volume", factor: 1000 },
  liters: { family: "volume", factor: 1000 },
  litre: { family: "volume", factor: 1000 },
  litres: { family: "volume", factor: 1000 },
  tsp: { family: "spoon", factor: 1 },
  teaspoon: { family: "spoon", factor: 1 },
  teaspoons: { family: "spoon", factor: 1 },
  tl: { family: "spoon", factor: 1 },
  tbsp: { family: "spoon", factor: 3 },
  tablespoon: { family: "spoon", factor: 3 },
  tablespoons: { family: "spoon", factor: 3 },
  el: { family: "spoon", factor: 3 },
  pc: { family: "count", factor: 1 },
  pcs: { family: "count", factor: 1 },
  piece: { family: "count", factor: 1 },
  pieces: { family: "count", factor: 1 },
  x: { family: "count", factor: 1 },
};

export function normalizeUnit(unit: string | null | undefined): { family: Family; factor: number } | null {
  const u = (unit ?? "").trim().toLowerCase().replace(/\.$/, "");
  if (u === "") return { family: "count", factor: 1 };
  return UNIT_MAP[u] ?? null;
}

export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function formatFamily(family: Family, base: number): string {
  switch (family) {
    case "mass":
      return base >= 1000 ? `${formatNumber(base / 1000)} kg` : `${formatNumber(base)} g`;
    case "volume":
      return base >= 1000 ? `${formatNumber(base / 1000)} l` : `${formatNumber(base)} ml`;
    case "spoon":
      return base >= 3 && Number.isInteger(Math.round(base * 100) / 300)
        ? `${formatNumber(base / 3)} tbsp`
        : `${formatNumber(base)} tsp`;
    case "count":
      return formatNumber(base);
  }
}

const FAMILY_ORDER: Family[] = ["mass", "volume", "spoon", "count"];
export const OTHER_CATEGORY = "Other";

export function aggregateGroceries(rows: GroceryInputRow[]): GroceryGroup[] {
  type Acc = {
    name: string;
    category: string;
    families: Map<Family, number>;
    other: Map<string, number>; // unknown unit -> summed amount
    text: string[];
  };
  const byKey = new Map<string, Acc>();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const key = row.ingredient_id || `name:${name.toLowerCase()}`;
    let acc = byKey.get(key);
    if (!acc) {
      acc = {
        name,
        category: row.category?.trim() || OTHER_CATEGORY,
        families: new Map(),
        other: new Map(),
        text: [],
      };
      byKey.set(key, acc);
    }
    const amount = row.amount != null && Number.isFinite(Number(row.amount)) ? Number(row.amount) : null;
    if (amount != null && amount > 0) {
      const norm = normalizeUnit(row.unit);
      if (norm) {
        acc.families.set(norm.family, (acc.families.get(norm.family) ?? 0) + amount * norm.factor);
      } else {
        const u = (row.unit ?? "").trim();
        acc.other.set(u, (acc.other.get(u) ?? 0) + amount);
      }
    } else if (row.quantity && row.quantity.trim()) {
      const t = row.quantity.trim();
      if (!acc.text.includes(t)) acc.text.push(t);
    }
  }

  const groups = new Map<string, GroceryItem[]>();
  for (const [key, acc] of byKey) {
    const quantities: string[] = [];
    for (const f of FAMILY_ORDER) {
      const v = acc.families.get(f);
      if (v != null) quantities.push(formatFamily(f, v));
    }
    for (const [u, v] of acc.other) quantities.push(`${formatNumber(v)} ${u}`);
    quantities.push(...acc.text);
    const list = groups.get(acc.category) ?? [];
    list.push({ key, name: acc.name, category: acc.category, quantities });
    groups.set(acc.category, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a === OTHER_CATEGORY ? 1 : b === OTHER_CATEGORY ? -1 : a.localeCompare(b)))
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function groceryListToText(groups: GroceryGroup[], title?: string): string {
  const lines: string[] = [];
  if (title) lines.push(title, "");
  for (const g of groups) {
    lines.push(`${g.category}:`);
    for (const i of g.items) {
      lines.push(`- ${i.name}${i.quantities.length ? ` (${i.quantities.join(" + ")})` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

export const ahSearchUrl = (name: string) => `https://www.ah.nl/zoeken?query=${encodeURIComponent(name)}`;
export const jumboSearchUrl = (name: string) =>
  `https://www.jumbo.com/producten/?searchTerms=${encodeURIComponent(name)}`;
