import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Returns a Supabase client, loading config from the server if env vars
 * are not available in the browser. Use this for auth (login, signup, session)
 * so it works even when NEXT_PUBLIC_ vars are not inlined.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;
  // Loaded on demand so the ~67 KB gz auth client is not in every page's first-load JS.
  const { createBrowserClient } = await import("@supabase/ssr");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    cachedClient = createBrowserClient(url, anonKey);
    return cachedClient;
  }

  const res = await fetch("/api/config/supabase");
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      hint?: string;
    };
    const msg = err.hint
      ? `${err.error ?? "Auth config unavailable"}. ${err.hint}`
      : err.error ??
        "Auth config unavailable. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server.";
    throw new Error(msg);
  }

  const { supabaseUrl, supabaseAnonKey } = (await res.json()) as {
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  };

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Auth config not set. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev server."
    );
  }

  cachedClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return cachedClient;
}
