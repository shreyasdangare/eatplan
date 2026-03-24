import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const targetHouseholdId = body.householdId;

  if (!targetHouseholdId || typeof targetHouseholdId !== "string") {
    return NextResponse.json({ error: "Invalid household ID" }, { status: 400 });
  }

  // Verify the target household exists
  const { data: household, error: hError } = await supabaseServer
    .from("households")
    .select("id")
    .eq("id", targetHouseholdId)
    .single();

  if (hError || !household) {
    return NextResponse.json({ error: "Household not found or invalid ID" }, { status: 404 });
  }

  // Optionally delete their old household if they were the only member, but we can just leave it orphaned for safety
  
  // Remove user from their current household
  await supabaseServer
    .from("household_members")
    .delete()
    .eq("user_id", auth.user.id);

  // Insert user into the new household
  const { error: insertError } = await supabaseServer
    .from("household_members")
    .insert({
      household_id: targetHouseholdId,
      user_id: auth.user.id,
      role: "member"
    });

  if (insertError) {
    console.error("Join error", insertError);
    return NextResponse.json({ error: "Failed to join household" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Successfully joined household!" });
}
