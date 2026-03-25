import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import {
  getDishIdsFromDateRange,
  aggregateIngredientsFromDishes,
} from "@/lib/shoppingListAggregate";

/** POST: auto-populate shopping list from meal plan for a date range. Merges with existing items, skips duplicates. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as { from?: string; to?: string } | undefined;
  let from = body?.from;
  let to = body?.to;

  if (!from || !to) {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(now);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    from = weekStart.toISOString().slice(0, 10);
    to = weekEnd.toISOString().slice(0, 10);
  }

  const dishIds = await getDishIdsFromDateRange(auth.user.id, from, to);
  const lines = await aggregateIngredientsFromDishes(dishIds);

  if (lines.length === 0) {
    return NextResponse.json({ added: 0, items: [], from, to });
  }

  const { data: existing } = await supabaseServer
    .from("shopping_list_items")
    .select("ingredient_id")
    .eq("household_id", householdId)
    .eq("status", "to_buy");

  const existingIngredientIds = new Set(
    (existing ?? [])
      .map((r: { ingredient_id: string | null }) => r.ingredient_id)
      .filter(Boolean)
  );

  // Also exclude ingredients already in the pantry
  const { data: pantryData } = await supabaseServer
    .from("pantry")
    .select("ingredient_id")
    .eq("household_id", householdId);

  const pantryIngredientIds = new Set(
    (pantryData ?? [])
      .map((r: { ingredient_id: string }) => r.ingredient_id)
      .filter(Boolean)
  );

  const toInsert = lines
    .filter((line) => !existingIngredientIds.has(line.ingredient_id) && !pantryIngredientIds.has(line.ingredient_id))
    .map((line) => ({
      household_id: householdId,
      ingredient_id: line.ingredient_id,
      custom_name: null,
      quantity: line.quantity_display || null,
      category: line.category ?? null,
      status: "to_buy" as const,
      source: "meal_plan" as const,
      urgency: "normal" as const,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({
      added: 0,
      items: [],
      from,
      to,
      message: "All ingredients already on list",
    });
  }

  const { data: inserted, error } = await supabaseServer
    .from("shopping_list_items")
    .insert(toInsert)
    .select("id, ingredient_id, custom_name, quantity, category, status, source, urgency, created_at, ingredients(name)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (inserted ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    household_id: householdId,
    ingredient_name: (r.ingredients as { name?: string } | null)?.name ?? null,
  }));

  return NextResponse.json({
    added: items.length,
    items,
    from,
    to,
  });
}
