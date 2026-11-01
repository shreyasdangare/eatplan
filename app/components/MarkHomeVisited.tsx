"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

/** On first visit, set user_metadata.has_visited_home so next time we show "Welcome back". */
export function MarkHomeVisited() {
  useEffect(() => {
    getSupabaseClient().then((supabase) => {
      // Only rendered when the server saw has_visited_home=false, so no extra getUser() round trip.
      supabase.auth
        .updateUser({ data: { has_visited_home: true } })
        .then(() => supabase.auth.refreshSession())
        .catch(() => {});
    });
  }, []);
  return null;
}
