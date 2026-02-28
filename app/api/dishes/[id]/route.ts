import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { data: dish, error } = await supabaseServer
    .from("dishes")
    .select(
      "id, name, description, meal_type, prep_time_minutes, tags, servings, image_url, instructions, dish_ingredients(id, ingredient_id, quantity, amount, unit, is_optional, ingredients(id, name))"
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (error) {
    console.error("Error fetching dish", error);
    return NextResponse.json(
      { error: "Failed to fetch dish" },
      { status: 500 }
    );
  }

  return NextResponse.json(dish);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await req.json();

  const {
    name,
    description,
    meal_type,
    prep_time_minutes,
    tags,
    servings,
    instructions,
    ingredients
  } = body as {
    name?: string;
    description?: string | null;
    meal_type?: string;
    prep_time_minutes?: number | null;
    tags?: string[] | null;
    servings?: number | null;
    instructions?: string | null;
    ingredients?: {
      ingredient_id: string;
      quantity?: string | null;
      amount?: number | null;
      unit?: string | null;
      is_optional?: boolean;
    }[];
  };

  const updatePayload: Record<string, unknown> = {};
  if (name !== undefined) updatePayload.name = name;
  if (description !== undefined) updatePayload.description = description;
  if (meal_type !== undefined) updatePayload.meal_type = meal_type;
  if (prep_time_minutes !== undefined) updatePayload.prep_time_minutes = prep_time_minutes;
  if (tags !== undefined) updatePayload.tags = tags;
  if (servings !== undefined) updatePayload.servings = servings;
  if (instructions !== undefined) updatePayload.instructions = instructions;

  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseServer
    .from("dishes")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error updating dish", error);
    return NextResponse.json(
      { error: "Failed to update dish" },
      { status: 500 }
    );
  }

  if (Array.isArray(ingredients)) {
    const { error: deleteError } = await supabaseServer
      .from("dish_ingredients")
      .delete()
      .eq("dish_id", id);

    if (deleteError) {
      console.error("Error deleting old dish ingredients", deleteError);
      return NextResponse.json(
        { error: "Failed to update ingredients" },
        { status: 500 }
      );
    }

    if (ingredients.length > 0) {
      const insertRows = ingredients.map((ing) => ({
        dish_id: id,
        ingredient_id: ing.ingredient_id,
        quantity: ing.quantity ?? null,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        is_optional: ing.is_optional ?? false
      }));

      const { error: insertError } = await supabaseServer
        .from("dish_ingredients")
        .insert(insertRows);

      if (insertError) {
        console.error("Error inserting dish ingredients", insertError);
        return NextResponse.json(
          { error: "Failed to update ingredients" },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { error } = await supabaseServer
    .from("dishes")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Error deleting dish", error);
    return NextResponse.json(
      { error: "Failed to delete dish" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

