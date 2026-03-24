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
    .select("id, name")
    .eq("id", householdId)
    .single();

  const { data: members, error: mError } = await supabaseServer
    .from("household_members")
    .select("user_id, role")
    .eq("household_id", householdId);

  if (hError || mError) {
    return NextResponse.json({ error: "Failed to fetch household" }, { status: 500 });
  }

  // We need to fetch email addresses for the user IDs.
  // Note: auth.users is only readable via service role, which supabaseServer uses.
  let membersWithEmails = members ?? [];
  
  if (members && members.length > 0) {
    const userIds = members.map(m => m.user_id);
    const { data: authUsers } = await supabaseServer.auth.admin.listUsers();
      
    if (authUsers?.users) {
      membersWithEmails = members.map(m => {
        const matchingUser = authUsers.users.find((u: any) => u.id === m.user_id);
        return {
          ...m,
          email: matchingUser?.email ?? "Unknown User"
        };
      });
    }
  }

  return NextResponse.json({
    id: household.id,
    name: household.name,
    members: membersWithEmails
  });
}
