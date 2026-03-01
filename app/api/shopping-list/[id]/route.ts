import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

/** PATCH: update a shopping list item (status, quantity, urgency, notes) */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = (await req.json()) as {
    status?: "to_buy" | "bought";
    quantity?: string | null;
    urgency?: "normal" | "urgent" | "if_convenient";
    notes?: string | null;
    category?: string | null;
  };

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status === "bought") {
      updates.bought_at = new Date().toISOString();
    } else {
      updates.bought_at = null;
    }
  }
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.urgency !== undefined) updates.urgency = body.urgency;
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.category !== undefined) updates.category = body.category;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("shopping_list_items")
    .update(updates)
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id, ingredient_id, custom_name, quantity, category, status, source, urgency, notes, bought_at, created_at, ingredients(name)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const row = data as Record<string, unknown>;
  return NextResponse.json({
    ...row,
    ingredient_name: (row.ingredients as { name?: string } | null)?.name ?? null,
  });
}

/** DELETE: remove a shopping list item */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;

  const { error } = await supabaseServer
    .from("shopping_list_items")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
