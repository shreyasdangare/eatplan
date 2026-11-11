"use client";

import { getSupabaseClient } from "@/lib/supabaseBrowser";
import type { GroceryStore } from "@/lib/groceryStores";

/** Saves the chosen grocery store in the user's metadata (same place as the other preferences). */
export async function saveGroceryStore(store: GroceryStore): Promise<void> {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.auth.updateUser({ data: { grocery_store: store } });
  if (error) throw error;
  // The server reads metadata from the JWT; refresh so the next request sees the change.
  await supabase.auth.refreshSession();
}
