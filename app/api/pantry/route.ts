import { NextRequest, NextResponse } from "next/server";
import { getConnectionId } from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const connectionId = await getConnectionId();
  if (!connectionId) {
    return NextResponse.json({ items: [] });
  }

  const { data, error } = await supabaseServer
    .from("pantry")
    .select("ingredient_id, amount, unit")
    .eq("connection_id", connectionId);

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
  const connectionId = await getConnectionId();
  if (!connectionId) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
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
      connection_id: connectionId,
      ingredient_id: ingredientId,
      amount: body.amount ?? null,
      unit: body.unit ?? null,
    },
    { onConflict: "connection_id,ingredient_id" }
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
  const connectionId = await getConnectionId();
  if (!connectionId) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
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
    .eq("connection_id", connectionId)
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
