import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can be ignored in Server Components that don't mutate cookies
        }
      },
    },
  });
}

export type SessionUser = {
  id: string;
  email?: string;
  preferred_name?: string;
  native_language?: string;
  has_visited_home?: boolean;
  is_vegetarian_only?: boolean;
};

type UserMetadata = { 
  preferred_name?: string; 
  native_language?: string; 
  has_visited_home?: boolean;
  isVegetarianOnly?: boolean;
};

/**
 * The signed-in user, verified locally from the JWT (ES256 via the project's JWKS) instead of a
 * round trip to Supabase Auth on every call. Memoised per request so layout + page + helpers share one check.
 * Metadata comes from the token, so clients refresh the session after updateUser().
 */
export const getSession = cache(async (): Promise<{
  user: SessionUser | null;
  error: Error | null;
}> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    return { user: null, error };
  }
  const claims = data?.claims as
    | { sub?: string; email?: string; user_metadata?: UserMetadata }
    | undefined;
  if (!claims?.sub) return { user: null, error: null };
  const meta = claims.user_metadata ?? {};
  return {
    user: {
      id: claims.sub,
      email: claims.email ?? undefined,
      preferred_name: meta.preferred_name ?? undefined,
      native_language: meta.native_language ?? undefined,
      has_visited_home: meta.has_visited_home === true,
      is_vegetarian_only: meta.isVegetarianOnly === true,
    },
    error: null,
  };
});

export async function requireAuth(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const { user, error } = await getSession();
  // No/expired session cookie is an auth failure (401), not a server error.
  if (error && (error.name === "AuthSessionMissingError" || "status" in error || error.name.startsWith("Auth"))) {
    return {
      error: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  if (error) {
    return {
      error: new Response(
        JSON.stringify({ error: "Session error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  if (!user) {
    return {
      error: new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }
  return { user };
}
