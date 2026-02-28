import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data, error } = await supabaseServer
    .from("favorites")
    .select("dish_id")
    .eq("user_id", auth.user.id);

  if (error) {
    console.error("Error fetching favorites", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }

  const favoriteIds = (data ?? []).map((r: { dish_id: string }) => r.dish_id);
  return NextResponse.json({ favoriteIds });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = (await req.json()) as { dish_id?: string };
  const dishId = body?.dish_id;
  if (!dishId) {
    return NextResponse.json(
      { error: "dish_id is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from("favorites")
    .upsert(
      { user_id: auth.user.id, dish_id: dishId },
      { onConflict: "user_id,dish_id" }
    );

  if (error) {
    console.error("Error adding favorite", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const dishId = searchParams.get("dish_id");
  if (!dishId) {
    return NextResponse.json(
      { error: "dish_id query param is required" },
      { status: 400 }
    );
  }

  const { error } = await supabaseServer
    .from("favorites")
    .delete()
    .eq("user_id", auth.user.id)
    .eq("dish_id", dishId);

  if (error) {
    console.error("Error removing favorite", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
