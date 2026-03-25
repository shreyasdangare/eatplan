import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

/** POST: set order of to_buy items by providing ordered array of ids */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as { ordered_ids?: string[] };
  const orderedIds = body.ordered_ids;
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json(
      { error: "ordered_ids array required" },
      { status: 400 }
    );
  }

  // Single RPC call to batch-update all positions
  const items = orderedIds.map((id, i) => ({ id, position: i }));
  const { error } = await supabaseServer.rpc("batch_reorder_shopping_list", {
    p_household_id: householdId,
    p_items: items,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
