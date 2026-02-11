import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type AggregatedLine = {
  ingredient_id: string;
  ingredient_name: string;
  quantity_display: string;
  amount?: number;
  unit?: string | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { dish_ids?: string[] };
  const dishIds = body.dish_ids ?? [];

  if (dishIds.length === 0) {
    return NextResponse.json({ lines: [] });
  }

  const { data: rows, error } = await supabaseServer
    .from("dish_ingredients")
    .select(
      "ingredient_id, quantity, amount, unit, ingredients(id, name)"
    )
    .in("dish_id", dishIds);

  if (error || !rows) {
    console.error("Error fetching dish ingredients for shopping list", error);
    return NextResponse.json(
      { error: "Failed to build shopping list" },
      { status: 500 }
    );
  }

  const byIngredient = new Map<
    string,
    { name: string; amounts: number[]; unit: string | null; quantityStrings: string[] }
  >();

  for (const row of rows as any[]) {
    const ing = row.ingredients;
    const ingredientId = row.ingredient_id as string;
    const name = ing?.name ?? "Unknown";
    const amount = row.amount != null ? Number(row.amount) : null;
    const unit = row.unit ?? null;
    const quantity = row.quantity ?? "";

    if (!byIngredient.has(ingredientId)) {
      byIngredient.set(ingredientId, {
        name,
        amounts: [],
        unit: null,
        quantityStrings: []
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
    let quantity_display: string;
    let amount: number | undefined;
    let unit: string | null = entry.unit;

    const parts: string[] = [];
    if (entry.amounts.length > 0 && entry.unit) {
      const total = entry.amounts.reduce((a, b) => a + b, 0);
      parts.push(`${total} ${entry.unit}`);
      amount = total;
    }
    if (entry.quantityStrings.length > 0) {
      parts.push(...entry.quantityStrings);
    }
    quantity_display = parts.join(", ");

    lines.push({
      ingredient_id: ingredientId,
      ingredient_name: entry.name,
      quantity_display,
      ...(amount != null && { amount }),
      ...(unit != null && unit !== "" && { unit })
    });
  }

  lines.sort((a, b) =>
    a.ingredient_name.localeCompare(b.ingredient_name)
  );

  return NextResponse.json({ lines });
}
