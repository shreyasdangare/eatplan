import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const { data, error } = await supabaseServer
    .from("pantry")
    .select("ingredient_id, amount, unit")
    .eq("household_id", householdId);

  if (error) {
    console.error("Error fetching pantry", error);
    return NextResponse.json(
      { error: "Failed to fetch pantry" },
      { status: 500 }
    );
  }

  const items = (data ?? []).map((r: { ingredient_id: string; amount: number | null; unit: string | null }) => ({
    ingredient_id: r.ingredient_id,
    amount: r.amount ?? null,
    unit: r.unit ?? null,
  }));
  const ingredient_ids = items.map((i) => i.ingredient_id);
  return NextResponse.json({ items, ingredient_ids });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as {
    ingredient_id?: string;
    amount?: number | null;
    unit?: string | null;
  };
  const ingredientId = body?.ingredient_id;
  if (!ingredientId) {
    return NextResponse.json(
      { error: "ingredient_id is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer.from("pantry").upsert(
    {
      household_id: householdId,
      ingredient_id: ingredientId,
      amount: body.amount ?? null,
      unit: body.unit ?? null,
    },
    { onConflict: "household_id,ingredient_id" }
  );

  if (error) {
    console.error("Error adding to pantry", error);
    return NextResponse.json(
      { error: "Failed to add to pantry" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const ingredientId = searchParams.get("ingredient_id");
  if (!ingredientId) {
    return NextResponse.json(
      { error: "ingredient_id query param is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from("pantry")
    .delete()
    .eq("household_id", householdId)
    .eq("ingredient_id", ingredientId);

  if (error) {
    console.error("Error removing from pantry", error);
    return NextResponse.json(
      { error: "Failed to remove from pantry" },
      { status: 500 }
    );
  }

  return new NextResponse(null, { status: 204 });
}
