"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

/** On first visit, set user_metadata.has_visited_home so next time we show "Welcome back". */
export function MarkHomeVisited() {
  useEffect(() => {
    getSupabaseClient().then((supabase) => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user?.user_metadata?.has_visited_home) {
          supabase.auth.updateUser({
            data: { has_visited_home: true },
          }).then(() => {});
        }
      });
    });
  }, []);
  return null;
}
