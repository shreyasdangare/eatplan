import { NextRequest, NextResponse } from "next/server";
import { getConnectionId } from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const connectionId = await getConnectionId(auth.user.id);
  if (!connectionId) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { date?: string; slot_type?: string };
  const { date, slot_type } = body;

  if (!date || !slot_type) {
    return NextResponse.json(
      { error: "date and slot_type required" },
      { status: 400 }
    );
  }

  const validSlots = ["breakfast", "lunch", "dinner"];
  if (!validSlots.includes(slot_type)) {
    return NextResponse.json(
      { error: "slot_type must be breakfast, lunch, or dinner" },
      { status: 400 }
    );
  }

  const { data: plan, error: planError } = await supabaseServer
    .from("meal_plans")
    .select("id, dish_id, prepared_at")
    .eq("user_id", auth.user.id)
    .eq("date", date)
    .eq("slot_type", slot_type)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "Meal plan slot not found" },
      { status: 404 }
    );
  }

  const row = plan as { id: string; dish_id: string | null; prepared_at: string | null };
  if (row.prepared_at) {
    return NextResponse.json({ ok: true, already_prepared: true });
  }

  const dishId = row.dish_id;
  if (!dishId) {
    const { error: updateErr } = await supabaseServer
      .from("meal_plans")
      .update({ prepared_at: new Date().toISOString() })
      .eq("id", row.id);
    if (updateErr) {
      return NextResponse.json(
        { error: "Failed to mark as prepared" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  const { data: dishIngredients, error: ingError } = await supabaseServer
    .from("dish_ingredients")
    .select("ingredient_id, amount, unit")
    .eq("dish_id", dishId);

  if (ingError) {
    return NextResponse.json(
      { error: "Failed to load dish ingredients" },
      { status: 500 }
    );
  }

  const ingredients = (dishIngredients ?? []) as {
    ingredient_id: string;
    amount: number | null;
    unit: string | null;
  }[];

  for (const ing of ingredients) {
    const { data: pantryRow } = await supabaseServer
      .from("pantry")
      .select("amount, unit")
      .eq("connection_id", connectionId)
      .eq("ingredient_id", ing.ingredient_id)
      .maybeSingle();

    if (!pantryRow) continue;

    const pantry = pantryRow as { amount: number | null; unit: string | null };
    const reqAmount = ing.amount;
    const reqUnit = ing.unit ?? null;
    const pantAmount = pantry.amount;
    const pantUnit = pantry.unit ?? null;

    if (pantAmount != null && reqAmount != null && reqUnit != null && pantUnit !== null && reqUnit === pantUnit) {
      const newAmount = pantAmount - reqAmount;
      if (newAmount <= 0) {
        await supabaseServer
          .from("pantry")
          .delete()
          .eq("connection_id", connectionId)
          .eq("ingredient_id", ing.ingredient_id);
      } else {
        await supabaseServer
          .from("pantry")
          .update({ amount: newAmount })
          .eq("connection_id", connectionId)
          .eq("ingredient_id", ing.ingredient_id);
      }
      continue;
    }

    if (pantAmount == null) {
      await supabaseServer
        .from("pantry")
        .delete()
        .eq("connection_id", connectionId)
        .eq("ingredient_id", ing.ingredient_id);
    }
  }

  const { error: updateErr } = await supabaseServer
    .from("meal_plans")
    .update({ prepared_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updateErr) {
    return NextResponse.json(
      { error: "Failed to mark as prepared" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
