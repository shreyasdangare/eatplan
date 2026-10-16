import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { generateInviteCode } from "@/lib/inviteCode";

/** Admins only: { action: "regenerate" } issues a new code (old one stops working); { action: "revoke" } turns invites off. */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const { data: me } = await supabaseServer
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (me?.role !== "admin") {
    return NextResponse.json({ error: "Only the household admin can change the invite code" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { action?: string };
  if (body.action !== "regenerate" && body.action !== "revoke") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const invite_code = body.action === "revoke" ? null : generateInviteCode();
    const { error } = await supabaseServer.from("households").update({ invite_code }).eq("id", householdId);
    if (!error) return NextResponse.json({ invite_code });
    if (error.code !== "23505") {
      console.error("Invite code update failed", error);
      break;
    }
  }
  return NextResponse.json({ error: "Failed to update invite code" }, { status: 500 });
}
