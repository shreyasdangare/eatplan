import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
};

type UserMetadata = { preferred_name?: string; native_language?: string; has_visited_home?: boolean };

export async function getSession(): Promise<{
  user: SessionUser | null;
  error: Error | null;
}> {
  const supabase = await createClient();
  const {
    data: { user: raw },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    return { user: null, error };
  }
  const meta = (raw?.user_metadata as UserMetadata | undefined) ?? {};
  const user = raw
    ? {
        id: raw.id,
        email: raw.email ?? undefined,
        preferred_name: meta.preferred_name ?? undefined,
        native_language: meta.native_language ?? undefined,
        has_visited_home: meta.has_visited_home === true,
      }
    : null;
  return { user, error: null };
}

export async function requireAuth(): Promise<
  { user: SessionUser } | { error: Response }
> {
  const { user, error } = await getSession();
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
