import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

type SuggestionRequest = {
  ingredient_ids: string[];
  always_available_ids?: string[];
};

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as SuggestionRequest;
  const ingredientIds = body.ingredient_ids ?? [];
  const alwaysAvailableIds = new Set(body.always_available_ids ?? []);

  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select(
      `id, name, description, meal_type, prep_time_minutes, tags,
       dish_ingredients(id, ingredient_id, is_optional)`
    )
    .eq("household_id", householdId);

  if (error || !dishes) {
    console.error("Error fetching dishes for suggestions", error);
    return NextResponse.json(
      { error: "Failed to compute suggestions" },
      { status: 500 }
    );
  }

  const haveSet = new Set(ingredientIds);

  const fullyCookable: any[] = [];
  const almostCookable: any[] = [];
  const others: any[] = [];

  for (const dish of dishes as any[]) {
    const required = (dish.dish_ingredients ?? []).filter(
      (di: any) =>
        !di.is_optional && !alwaysAvailableIds.has(di.ingredient_id as string)
    );

    const requiredIds = required.map((di: any) => di.ingredient_id as string);
    const missing = requiredIds.filter((id: string) => !haveSet.has(id));
    const haveCount = requiredIds.length - missing.length;
    const missingCount = missing.length;
    const matchPct =
      requiredIds.length === 0
        ? 1
        : Math.round((haveCount / requiredIds.length) * 100);

    const enriched = {
      ...dish,
      stats: {
        haveCount,
        missingCount,
        matchPct,
        missingIngredientIds: missing
      }
    };

    if (missingCount === 0) {
      fullyCookable.push(enriched);
    } else if (missingCount <= 2) {
      almostCookable.push(enriched);
    } else {
      others.push(enriched);
    }
  }

  const byMatch = (a: any, b: any) =>
    (b.stats?.matchPct ?? 0) - (a.stats?.matchPct ?? 0);

  fullyCookable.sort(byMatch);
  almostCookable.sort(byMatch);
  others.sort(byMatch);

  return NextResponse.json({
    fullyCookable,
    almostCookable,
    others
  });
}

