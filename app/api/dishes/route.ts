import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("dishes")
    .select("id, name, description, meal_type, prep_time_minutes, tags")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching dishes", error);
    return NextResponse.json(
      { error: "Failed to fetch dishes" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    description,
    meal_type,
    prep_time_minutes,
    tags,
    ingredients
  } = body as {
    name?: string;
    description?: string;
    meal_type?: string;
    prep_time_minutes?: number | null;
    tags?: string[] | null;
    ingredients?: {
      ingredient_id: string;
      quantity?: string | null;
      is_optional?: boolean;
    }[];
  };

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data: dish, error } = await supabaseServer
    .from("dishes")
    .insert({
      name,
      description,
      meal_type,
      prep_time_minutes,
      tags
    })
    .select("id")
    .single();

  if (error || !dish) {
    console.error("Error creating dish", error);
    return NextResponse.json(
      { error: "Failed to create dish" },
      { status: 500 }
    );
  }

  if (ingredients && ingredients.length > 0) {
    const insertRows = ingredients.map((ing) => ({
      dish_id: dish.id,
      ingredient_id: ing.ingredient_id,
      quantity: ing.quantity ?? null,
      is_optional: ing.is_optional ?? false
    }));

    const { error: diError } = await supabaseServer
      .from("dish_ingredients")
      .insert(insertRows);

    if (diError) {
      console.error("Error creating dish ingredients", diError);
      return NextResponse.json(
        { error: "Dish created but ingredients failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ id: dish.id }, { status: 201 });
}

