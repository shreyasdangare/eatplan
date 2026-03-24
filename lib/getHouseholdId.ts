import { supabaseServer } from "@/lib/supabaseServer";

export async function getHouseholdId(userId: string): Promise<string | null> {
  if (!userId) return null;

  // Attempt to fetch the primary household attached to this user
  const { data, error } = await supabaseServer
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (data?.household_id) {
    return data.household_id;
  }
  
  if (error && error.code !== "PGRST116") {
    // Log unexpected errors other than 'Row not found'
    console.error("Error fetching household membership:", error);
  }

  // If we reach here, the user is not in ANY household (eg. brand new user signup).
  // Automatically provision a fresh Household for them.
  const newHouseholdId = crypto.randomUUID();
  
  const { error: insertHouseErr } = await supabaseServer
    .from("households")
    .insert({ id: newHouseholdId, name: "My Household" });

  if (insertHouseErr) {
    console.error("Failed to provision household for new user", insertHouseErr);
    return null;
  }

  // Bind the newly created household to the user as an Admin
  const { error: memberErr } = await supabaseServer
    .from("household_members")
    .insert({ household_id: newHouseholdId, user_id: userId, role: "admin" });

  if (memberErr) {
    console.error("Failed to link new user to household", memberErr);
    return null;
  }

  return newHouseholdId;
}
