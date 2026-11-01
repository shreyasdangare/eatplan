import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { aggregateGroceries, type GroceryInputRow } from "@/lib/groceryAggregate";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** GET ?from=YYYY-MM-DD&to=YYYY-MM-DD: combined ingredients for all meals planned in the range (read-only). */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  if (!ISO.test(from) || !ISO.test(to)) {
    return NextResponse.json({ error: "Query params from and to (YYYY-MM-DD) required" }, { status: 400 });
  }

  const { data: plans, error: planError } = await supabaseServer
    .from("meal_plans")
    .select("dish_id")
    .eq("household_id", householdId)
    .gte("date", from)
    .lte("date", to)
    .not("dish_id", "is", null);
  if (planError) {
    console.error("grocery-list: meal_plans failed", planError);
    return NextResponse.json({ error: "Failed to load meal plan" }, { status: 500 });
  }

  // Count each planned meal: a dish planned twice needs its ingredients twice.
  const dishCounts = new Map<string, number>();
  for (const p of (plans ?? []) as { dish_id: string | null }[]) {
    if (p.dish_id) dishCounts.set(p.dish_id, (dishCounts.get(p.dish_id) ?? 0) + 1);
  }
  const mealCount = [...dishCounts.values()].reduce((a, b) => a + b, 0);
  if (dishCounts.size === 0) return NextResponse.json({ from, to, mealCount, groups: [] });

  const { data: rows, error } = await supabaseServer
    .from("dish_ingredients")
    .select("dish_id, ingredient_id, quantity, amount, unit, ingredients(name, category)")
    .in("dish_id", [...dishCounts.keys()]);
  if (error) {
    console.error("grocery-list: dish_ingredients failed", error);
    return NextResponse.json({ error: "Failed to load ingredients" }, { status: 500 });
  }

  type Row = {
    dish_id: string;
    ingredient_id: string | null;
    quantity: string | null;
    amount: number | null;
    unit: string | null;
    ingredients: { name?: string; category?: string | null } | { name?: string; category?: string | null }[] | null;
  };
  const input: GroceryInputRow[] = [];
  for (const r of (rows ?? []) as Row[]) {
    const ing = Array.isArray(r.ingredients) ? r.ingredients[0] : r.ingredients;
    const times = dishCounts.get(r.dish_id) ?? 1;
    for (let i = 0; i < times; i++) {
      input.push({
        ingredient_id: r.ingredient_id,
        name: ing?.name ?? "Unknown",
        category: ing?.category ?? null,
        amount: r.amount,
        unit: r.unit,
        quantity: r.quantity,
      });
    }
  }

  return NextResponse.json({ from, to, mealCount, groups: aggregateGroceries(input) });
}
