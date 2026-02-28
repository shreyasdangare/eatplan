import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Query params from and to (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseServer
    .from("meal_plans")
    .select("id, date, slot_type, dish_id, prepared_at, dishes(id, name)")
    .eq("user_id", auth.user.id)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (error) {
    console.error("Error fetching meal plans", error);
    return NextResponse.json(
      { error: "Failed to fetch meal plans" },
      { status: 500 }
    );
  }

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    date: string;
    slot_type: string;
    dish_id: string | null;
  };
  const { date, slot_type, dish_id } = body;

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

  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { data: existing } = await supabaseServer
    .from("meal_plans")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("date", date)
    .eq("slot_type", slot_type)
    .maybeSingle();

  if (existing) {
    const { error: updateError } = await supabaseServer
      .from("meal_plans")
      .update({ dish_id: dish_id ?? null })
      .eq("id", existing.id);

    if (updateError) {
      console.error("Error updating meal plan", updateError);
      return NextResponse.json(
        { error: "Failed to update slot" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  if (!dish_id) {
    return NextResponse.json({ ok: true });
  }

  const { error: insertError } = await supabaseServer.from("meal_plans").insert({
    user_id: auth.user.id,
    date,
    slot_type,
    dish_id
  });

  if (insertError) {
    console.error("Error inserting meal plan", insertError);
    return NextResponse.json(
      { error: "Failed to set slot" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
