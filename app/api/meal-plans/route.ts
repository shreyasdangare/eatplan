import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

const MAX_DISHES_PER_SLOT = 5;

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

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
    .select("id, date, slot_type, dish_id, position, prepared_at, dishes(id, name)")
    .eq("household_id", householdId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true })
    .order("position", { ascending: true });

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

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  if (!dish_id) {
    // Clear all dishes from this slot
    const { error: deleteError } = await supabaseServer
      .from("meal_plans")
      .delete()
      .eq("household_id", householdId)
      .eq("date", date)
      .eq("slot_type", slot_type);

    if (deleteError) {
      console.error("Error clearing meal plan slot", deleteError);
      return NextResponse.json(
        { error: "Failed to clear slot" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Find the current max position for this slot
  const { data: existing } = await supabaseServer
    .from("meal_plans")
    .select("position")
    .eq("household_id", householdId)
    .eq("date", date)
    .eq("slot_type", slot_type)
    .order("position", { ascending: false })
    .limit(1);

  const currentCount = (existing?.length ?? 0) > 0 ? (existing![0].position + 1) : 0;

  if (currentCount >= MAX_DISHES_PER_SLOT) {
    return NextResponse.json(
      { error: `Maximum ${MAX_DISHES_PER_SLOT} dishes per meal slot` },
      { status: 400 }
    );
  }

  const nextPosition = currentCount > 0 ? existing![0].position + 1 : 0;

  const { error: insertError } = await supabaseServer.from("meal_plans").insert({
    household_id: householdId,
    date,
    slot_type,
    dish_id,
    position: nextPosition,
  });

  if (insertError) {
    console.error("Error inserting meal plan", insertError);
    return NextResponse.json(
      { error: "Failed to add dish to slot" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("id");

  if (!planId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  // Verify the plan belongs to this household
  const { data: plan } = await supabaseServer
    .from("meal_plans")
    .select("id, date, slot_type, position")
    .eq("id", planId)
    .eq("household_id", householdId)
    .maybeSingle();

  if (!plan) {
    return NextResponse.json({ error: "Plan entry not found" }, { status: 404 });
  }

  // Delete the entry
  const { error: deleteError } = await supabaseServer
    .from("meal_plans")
    .delete()
    .eq("id", planId);

  if (deleteError) {
    console.error("Error deleting meal plan entry", deleteError);
    return NextResponse.json({ error: "Failed to remove dish" }, { status: 500 });
  }

  // Re-compact positions for the remaining entries in this slot
  const { data: remaining } = await supabaseServer
    .from("meal_plans")
    .select("id, position")
    .eq("household_id", householdId)
    .eq("date", plan.date)
    .eq("slot_type", plan.slot_type)
    .order("position", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].position !== i) {
        await supabaseServer
          .from("meal_plans")
          .update({ position: i })
          .eq("id", remaining[i].id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    date: string;
    slot_type: string;
    ordered_ids: string[];
  };
  const { date, slot_type, ordered_ids } = body;

  if (!date || !slot_type || !ordered_ids?.length) {
    return NextResponse.json({ error: "date, slot_type, and ordered_ids required" }, { status: 400 });
  }

  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  // Update positions based on the new order
  for (let i = 0; i < ordered_ids.length; i++) {
    const { error } = await supabaseServer
      .from("meal_plans")
      .update({ position: i })
      .eq("id", ordered_ids[i])
      .eq("household_id", householdId);

    if (error) {
      console.error("Error reordering meal plan", error);
      return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
