import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getConnectionId } from "@/lib/todoistAuth";
import { requireAuth } from "@/lib/supabaseServerClient";

type AggregatedLine = {
  ingredient_id: string;
  ingredient_name: string;
  quantity_display: string;
  amount?: number;
  unit?: string | null;
};

type ShoppingListItem = AggregatedLine & {
  in_stock_reason?: string;
};

async function getDishIdsFromDateRange(
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
  const ids = [...new Set((data as { dish_id: string }[]).map((r) => r.dish_id).filter(Boolean))];
  return ids;
}

async function aggregateIngredients(
  dishIds: string[]
): Promise<AggregatedLine[]> {
  if (dishIds.length === 0) return [];

  const { data: rows, error } = await supabaseServer
    .from("dish_ingredients")
    .select(
      "ingredient_id, quantity, amount, unit, ingredients(id, name)"
    )
    .in("dish_id", dishIds);

  if (error || !rows) return [];

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
    quantity_display = parts.length ? parts.join(", ") : "";

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

  return lines;
}

function splitByPantry(
  lines: AggregatedLine[],
  pantry: { ingredient_id: string; amount: number | null; unit: string | null }[]
): { to_buy: ShoppingListItem[]; in_stock: ShoppingListItem[] } {
  const pantryByIngredient = new Map(
    pantry.map((p) => [p.ingredient_id, { amount: p.amount, unit: p.unit }])
  );

  const to_buy: ShoppingListItem[] = [];
  const in_stock: ShoppingListItem[] = [];

  for (const line of lines) {
    const p = pantryByIngredient.get(line.ingredient_id);
    if (!p) {
      to_buy.push(line);
      continue;
    }
    const pantryAmount = p.amount;
    const pantryUnit = p.unit ?? null;
    const requiredAmount = line.amount;
    const requiredUnit = line.unit ?? null;

    if (pantryAmount == null) {
      in_stock.push({
        ...line,
        in_stock_reason: "In pantry",
      });
      continue;
    }
    if (
      requiredAmount != null &&
      requiredUnit != null &&
      pantryUnit !== null &&
      requiredUnit === pantryUnit &&
      pantryAmount >= requiredAmount
    ) {
      in_stock.push({
        ...line,
        in_stock_reason: `In pantry: ${pantryAmount} ${pantryUnit}`,
      });
      continue;
    }
    if (requiredAmount == null || requiredUnit == null || requiredUnit !== pantryUnit) {
      in_stock.push({
        ...line,
        in_stock_reason: `In pantry: ${pantryAmount}${pantryUnit ? ` ${pantryUnit}` : ""}`,
      });
      continue;
    }
    const needMore = requiredAmount - pantryAmount;
    if (needMore <= 0) {
      in_stock.push({
        ...line,
        in_stock_reason: `In pantry: ${pantryAmount} ${pantryUnit}`,
      });
    } else {
      to_buy.push({
        ...line,
        quantity_display: `Need ${needMore} more ${requiredUnit}`,
        amount: needMore,
        unit: requiredUnit,
      });
    }
  }

  return { to_buy, in_stock };
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params from and to (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const dishIds = await getDishIdsFromDateRange(auth.user.id, from, to);
  const lines = await aggregateIngredients(dishIds);

  const connectionId = await getConnectionId(auth.user.id);
  if (!connectionId) {
    return NextResponse.json({
      to_buy: lines,
      in_stock: [],
    });
  }

  const { data: pantryRows } = await supabaseServer
    .from("pantry")
    .select("ingredient_id, amount, unit")
    .eq("connection_id", connectionId);

  const pantry = (pantryRows ?? []).map((r: { ingredient_id: string; amount: number | null; unit: string | null }) => ({
    ingredient_id: r.ingredient_id,
    amount: r.amount,
    unit: r.unit,
  }));

  const { to_buy, in_stock } = splitByPantry(lines, pantry);
  return NextResponse.json({ to_buy, in_stock });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as {
    dish_ids?: string[];
    from?: string;
    to?: string;
  };

  let dishIds = body.dish_ids ?? [];
  if (dishIds.length === 0 && body.from && body.to) {
    dishIds = await getDishIdsFromDateRange(auth.user.id, body.from, body.to);
  }

  const lines = await aggregateIngredients(dishIds);

  const connectionId = await getConnectionId(auth.user.id);
  if (!connectionId) {
    return NextResponse.json({
      to_buy: lines,
      in_stock: [],
      lines,
    });
  }

  const { data: pantryRows } = await supabaseServer
    .from("pantry")
    .select("ingredient_id, amount, unit")
    .eq("connection_id", connectionId);

  const pantry = (pantryRows ?? []).map((r: { ingredient_id: string; amount: number | null; unit: string | null }) => ({
    ingredient_id: r.ingredient_id,
    amount: r.amount,
    unit: r.unit,
  }));

  const { to_buy, in_stock } = splitByPantry(lines, pantry);
  return NextResponse.json({
    to_buy,
    in_stock,
    lines: to_buy.concat(in_stock),
  });
}
