"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SWRConfig, useSWRConfig } from "swr";
import { getSupabaseClient } from "@/lib/supabaseBrowser";
import { jsonFetcher } from "@/lib/swr";

// POSTs that only read/compute and never change data shown on other pages.
const READ_ONLY_POSTS = [/^\/api\/translate-ingredient/, /^\/api\/import-recipe/, /^\/api\/suggestions/];

/**
 * Client data cache for all tabs, plus Router Cache invalidation: server-rendered tabs (Home, Recipes)
 * are kept in the client Router Cache for a short time (next.config staleTimes) so tab switches are
 * instant. After any successful data change through our API we call router.refresh() (debounced),
 * which purges that cache so the next visit shows fresh data.
 */
function RouterCacheInvalidator() {
  const router = useRouter();
  useEffect(() => {
    const original = window.fetch;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const patched: typeof window.fetch = async (input, init) => {
      const res = await original(input, init);
      try {
        const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
        if (method !== "GET" && method !== "HEAD" && res.ok) {
          const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
          const url = new URL(raw, window.location.href);
          if (
            url.origin === window.location.origin &&
            url.pathname.startsWith("/api/") &&
            !READ_ONLY_POSTS.some((r) => r.test(url.pathname))
          ) {
            clearTimeout(timer);
            timer = setTimeout(() => router.refresh(), 800);
          }
        }
      } catch {}
      return res;
    };
    window.fetch = patched;
    return () => {
      clearTimeout(timer);
      if (window.fetch === patched) window.fetch = original;
    };
  }, [router]);
  return null;
}

/** Drops all cached data when the signed-in user changes (sign-out, account switch). */
function ClearCacheOnAuthChange() {
  const { mutate } = useSWRConfig();
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let userId: string | null | undefined;
    getSupabaseClient()
      .then((supabase) => {
        if (cancelled) return;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          const next = session?.user?.id ?? null;
          if (userId !== undefined && next !== userId) {
            void mutate(() => true, undefined, { revalidate: false });
          }
          userId = next;
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [mutate]);
  return null;
}

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: jsonFetcher,
        revalidateOnFocus: true,
        dedupingInterval: 2000,
        keepPreviousData: true,
      }}
    >
      <RouterCacheInvalidator />
      <ClearCacheOnAuthChange />
      {children}
    </SWRConfig>
  );
}
