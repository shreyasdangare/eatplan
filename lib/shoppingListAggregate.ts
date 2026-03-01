import { supabaseServer } from "@/lib/supabaseServer";

export type AggregatedLine = {
  ingredient_id: string;
  ingredient_name: string;
  quantity_display: string;
  category?: string | null;
};

export async function getDishIdsFromDateRange(
  userId: string,
  from: string,
  to: string
): Promise<string[]> {
  const { data, error } = await supabaseServer
    .from("meal_plans")
    .select("dish_id")
    .eq("user_id", userId)
    .gte("date", from)
    .lte("date", to)
    .not("dish_id", "is", null);

  if (error || !data) return [];
  return [
    ...new Set(
      (data as { dish_id: string }[]).map((r) => r.dish_id).filter(Boolean)
    ),
  ];
}

export async function aggregateIngredientsFromDishes(
  dishIds: string[]
): Promise<AggregatedLine[]> {
  if (dishIds.length === 0) return [];

  const { data: rows, error } = await supabaseServer
    .from("dish_ingredients")
    .select(
      "ingredient_id, quantity, amount, unit, ingredients(id, name, category)"
    )
    .in("dish_id", dishIds);

  if (error || !rows) return [];

  const byIngredient = new Map<
    string,
    {
      name: string;
      category: string | null;
      amounts: number[];
      unit: string | null;
      quantityStrings: string[];
    }
  >();

  type Row = {
    ingredient_id: string;
    quantity: string;
    amount: number | null;
    unit: string | null;
    ingredients: { id?: string; name?: string; category?: string | null } | { id?: string; name?: string; category?: string | null }[] | null;
  };
  for (const row of rows as Row[]) {
    const rawIng = row.ingredients;
    const ing = Array.isArray(rawIng) ? rawIng[0] : rawIng;
    const ingredientId = row.ingredient_id;
    const name = ing?.name ?? "Unknown";
    const category = ing?.category ?? null;
    const amount = row.amount != null ? Number(row.amount) : null;
    const unit = row.unit ?? null;
    const quantity = row.quantity ?? "";

    if (!byIngredient.has(ingredientId)) {
      byIngredient.set(ingredientId, {
        name,
        category,
        amounts: [],
        unit: null,
        quantityStrings: [],
      });
    }
    const entry = byIngredient.get(ingredientId)!;

    if (amount != null && unit !== null && unit !== "") {
      if (entry.unit === null) {
        entry.unit = unit;
        entry.amounts.push(amount);
      } else if (entry.unit === unit) {
        entry.amounts.push(amount);
      } else {
        entry.quantityStrings.push(`${amount} ${unit}`);
      }
    } else if (quantity.trim()) {
      entry.quantityStrings.push(quantity.trim());
    }
  }

  const lines: AggregatedLine[] = [];

  for (const [ingredientId, entry] of byIngredient.entries()) {
    const parts: string[] = [];
    if (entry.amounts.length > 0 && entry.unit) {
      const total = entry.amounts.reduce((a, b) => a + b, 0);
      parts.push(`${total} ${entry.unit}`);
    }
    if (entry.quantityStrings.length > 0) {
      parts.push(...entry.quantityStrings);
    }
    const quantity_display = parts.length ? parts.join(", ") : "";

    lines.push({
      ingredient_id: ingredientId,
      ingredient_name: entry.name,
      quantity_display,
      category: entry.category,
    });
  }

  lines.sort((a, b) => a.ingredient_name.localeCompare(b.ingredient_name));
  return lines;
}
