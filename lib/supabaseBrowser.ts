import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Synchronous client creation when env vars are already inlined (e.g. after restart).
 * Throws if NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY are missing.
 */
export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local (anon key: Supabase Dashboard → Project Settings → API). " +
        "Restart the dev server (npm run dev) after changing .env.local."
    );
  }
  return createBrowserClient(url, anonKey);
}

/**
 * Returns a Supabase client, loading config from the server if env vars
 * are not available in the browser. Use this for auth (login, signup, session)
 * so it works even when NEXT_PUBLIC_ vars are not inlined.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;

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
