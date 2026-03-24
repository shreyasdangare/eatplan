import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

/** POST: clear all "bought" items, optionally older than X days */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const body = (await req.json()) as { older_than_days?: number } | undefined;
  const olderThanDays = body?.older_than_days;

  let query = supabaseServer
    .from("shopping_list_items")
    .delete()
    .eq("household_id", householdId)
    .eq("status", "bought");

  if (olderThanDays != null && olderThanDays > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    query = query.lt("bought_at", cutoff.toISOString());
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
