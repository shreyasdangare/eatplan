import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const { data: household, error: hError } = await supabaseServer
    .from("households")
    .select("id, name, invite_code")
    .eq("id", householdId)
    .single();

  const { data: members, error: mError } = await supabaseServer
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId);

  if (hError || mError) {
    return NextResponse.json({ error: "Failed to fetch household" }, { status: 500 });
  }

  // Look up only this household's members (listUsers() returned just the first page of all users).
  const membersWithEmails = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data } = await supabaseServer.auth.admin.getUserById(m.user_id);
      return { ...m, email: data?.user?.email ?? "Unknown user" };
    })
  );
  const myRole = members?.find((m) => m.user_id === auth.user.id)?.role ?? "member";

  return NextResponse.json({
    id: household.id,
    name: household.name,
    invite_code: household.invite_code ?? null,
    my_role: myRole,
    members: membersWithEmails
  });
}
