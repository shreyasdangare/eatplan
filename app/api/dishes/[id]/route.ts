import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id } = params;

  const { data: dish, error } = await supabaseServer
    .from("dishes")
    .select(
      "id, name, description, meal_type, prep_time_minutes, tags, dish_ingredients(id, ingredient_id, quantity, is_optional)"
    )
    .eq("id", id)
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

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = params;
  const body = await req.json();

  const { data, error } = await supabaseServer
    .from("dishes")
    .update({
      name: body.name,
      description: body.description,
      meal_type: body.meal_type,
      prep_time_minutes: body.prep_time_minutes,
      tags: body.tags
    })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error updating dish", error);
    return NextResponse.json(
      { error: "Failed to update dish" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id });
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const { id } = params;

  const { error } = await supabaseServer.from("dishes").delete().eq("id", id);

  if (error) {
    console.error("Error deleting dish", error);
    return NextResponse.json(
      { error: "Failed to delete dish" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

