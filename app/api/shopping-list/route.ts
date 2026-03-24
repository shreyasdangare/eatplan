import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

export type ShoppingListItemRow = {
  id: string;
  household_id: string;
  ingredient_id: string | null;
  custom_name: string | null;
  quantity: string | null;
  category: string | null;
  status: "to_buy" | "bought";
  source: "meal_plan" | "manual";
  urgency: "normal" | "urgent" | "if_convenient";
  notes: string | null;
  bought_at: string | null;
  created_at: string;
  ingredient_name?: string | null;
  position?: number | null;
};

/** GET: return user's persistent shopping list items, split by status */
export async function GET(_req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const { data: rows, error } = await supabaseServer
    .from("shopping_list_items")
    .select(
      "id, household_id, ingredient_id, custom_name, quantity, category, status, source, urgency, notes, bought_at, created_at, position, ingredients(name)"
    )
    .eq("household_id", householdId)
    .order("position", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    household_id: r.household_id,
    ingredient_id: r.ingredient_id ?? null,
    custom_name: r.custom_name ?? null,
    quantity: r.quantity ?? null,
    category: r.category ?? null,
    status: r.status,
    source: r.source,
    urgency: r.urgency,
    notes: r.notes ?? null,
    bought_at: r.bought_at ?? null,
    created_at: r.created_at,
    position: r.position ?? null,
    ingredient_name: (r.ingredients as { name?: string } | null)?.name ?? null,
  })) as ShoppingListItemRow[];

  const to_buy = items.filter((i) => i.status === "to_buy");
  const bought = items.filter((i) => i.status === "bought");

  return NextResponse.json({
    to_buy,
    bought,
    items,
  });
}

/** POST: add one or more items to the shopping list */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as {
    ingredient_id?: string;
    custom_name?: string;
    quantity?: string;
    category?: string;
    source?: "meal_plan" | "manual";
    urgency?: "normal" | "urgent" | "if_convenient";
    items?: Array<{
      ingredient_id?: string;
      custom_name?: string;
      quantity?: string;
      category?: string;
      source?: "meal_plan" | "manual";
      urgency?: "normal" | "urgent" | "if_convenient";
    }>;
  };

  const toInsert = body.items?.length
    ? body.items.map((item) => ({
        household_id: householdId,
        ingredient_id: item.ingredient_id ?? null,
        custom_name: item.custom_name ?? null,
        quantity: item.quantity ?? null,
        category: item.category ?? null,
        status: "to_buy" as const,
        source: item.source ?? "manual",
        urgency: item.urgency ?? "normal",
      }))
    : [
        {
          household_id: householdId,
          ingredient_id: body.ingredient_id ?? null,
          custom_name: body.custom_name ?? null,
          quantity: body.quantity ?? null,
          category: body.category ?? null,
          status: "to_buy" as const,
          source: body.source ?? "manual",
          urgency: body.urgency ?? "normal",
        },
      ];

  const { data, error } = await supabaseServer
    .from("shopping_list_items")
    .insert(toInsert)
    .select("id, ingredient_id, custom_name, quantity, category, status, source, urgency, notes, bought_at, created_at, ingredients(name)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const inserted = (data ?? []) as Record<string, unknown>[];
  const withName = inserted.map((r) => ({
    ...r,
    household_id: householdId,
    ingredient_name: (r.ingredients as { name?: string } | null)?.name ?? null,
  }));

  return NextResponse.json({
    added: withName.length,
    items: withName,
  });
}
