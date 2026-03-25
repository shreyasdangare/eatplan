import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

/**
 * POST: Mark a meal plan entry as prepared and deduct ingredient quantities
 * from the pantry. Expects { meal_plan_id: string }.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as { meal_plan_id?: string };
  const mealPlanId = body?.meal_plan_id;
  if (!mealPlanId) {
    return NextResponse.json(
      { error: "meal_plan_id is required" },
      { status: 400 }
    );
  }

  // 1. Fetch the meal plan entry with its dish's ingredients
  const { data: mealPlan, error: mpError } = await supabaseServer
    .from("meal_plans")
    .select("id, dish_id, prepared_at")
    .eq("id", mealPlanId)
    .eq("household_id", householdId)
    .single();

  if (mpError || !mealPlan) {
    return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  }

  if (!mealPlan.dish_id) {
    return NextResponse.json({ error: "No dish assigned" }, { status: 400 });
  }

  // Mark as prepared
  await supabaseServer
    .from("meal_plans")
    .update({ prepared_at: new Date().toISOString() })
    .eq("id", mealPlanId);

  // 2. Fetch dish ingredients with structured amounts
  const { data: dishIngredients } = await supabaseServer
    .from("dish_ingredients")
    .select("ingredient_id, amount, unit")
    .eq("dish_id", mealPlan.dish_id);

  if (!dishIngredients || dishIngredients.length === 0) {
    return NextResponse.json({ ok: true, deducted: 0 });
  }

  // 3. Fetch pantry items for this household
  const { data: pantryItems } = await supabaseServer
    .from("pantry")
    .select("id, ingredient_id, amount, unit")
    .eq("household_id", householdId);

  if (!pantryItems || pantryItems.length === 0) {
    return NextResponse.json({ ok: true, deducted: 0 });
  }

  // 4. Deduct amounts where units match
  let deducted = 0;
  for (const di of dishIngredients) {
    if (di.amount == null || !di.unit) continue;

    const pantryItem = pantryItems.find(
      (p) =>
        p.ingredient_id === di.ingredient_id &&
        p.amount != null &&
        p.unit?.toLowerCase() === di.unit?.toLowerCase()
    );

    if (pantryItem && pantryItem.amount != null) {
      const newAmount = Math.max(0, pantryItem.amount - di.amount);
      await supabaseServer
        .from("pantry")
        .update({ amount: newAmount })
        .eq("id", pantryItem.id);
      deducted++;
    }
  }

  return NextResponse.json({ ok: true, deducted });
}
