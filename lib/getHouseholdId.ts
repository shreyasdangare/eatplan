import { generateInviteCode } from "@/lib/inviteCode";
import { supabaseServer } from "@/lib/supabaseServer";

/** The user's primary household: the earliest membership, so the answer is stable if duplicates exist. */
async function primaryMembership(userId: string) {
  return supabaseServer
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .order("household_id", { ascending: true })
    .limit(1)
    .maybeSingle();
}

export async function getHouseholdId(userId: string): Promise<string | null> {
  if (!userId) return null;

  const { data, error } = await primaryMembership(userId);

  if (data?.household_id) {
    return data.household_id;
  }
  
  if (error) {
    // Log unexpected errors other than 'Row not found'
    console.error("Error fetching household membership:", error);
  }

  // If we reach here, the user is not in ANY household (eg. brand new user signup).
  // Automatically provision a fresh Household for them.
  const newHouseholdId = crypto.randomUUID();
  
  const { error: insertHouseErr } = await supabaseServer
    .from("households")
    .insert({ id: newHouseholdId, name: "My Household", invite_code: generateInviteCode() });

  if (insertHouseErr) {
    console.error("Failed to provision household for new user", insertHouseErr);
    return null;
  }

  // Bind the newly created household to the user as an Admin
  const { error: memberErr } = await supabaseServer
    .from("household_members")
    .insert({ household_id: newHouseholdId, user_id: userId, role: "admin" });

  if (memberErr?.code === "23505") {
    // Another concurrent request already linked this user (unique user_id, migration 023).
    await supabaseServer.from("households").delete().eq("id", newHouseholdId);
    const { data: existing } = await primaryMembership(userId);
    return existing?.household_id ?? null;
  }
  if (memberErr) {
    console.error("Failed to link new user to household", memberErr);
    return null;
  }

  // A brand-new user's first page fires several API calls at once, and each can get here and
  // provision its own household (seen on prod). Converge on the earliest one and drop ours if we lost.
  const { data: winner } = await primaryMembership(userId);
  if (winner?.household_id && winner.household_id !== newHouseholdId) {
    await supabaseServer.from("household_members").delete().eq("user_id", userId).eq("household_id", newHouseholdId);
    await supabaseServer.from("households").delete().eq("id", newHouseholdId);
    return winner.household_id;
  }

  return newHouseholdId;
}
