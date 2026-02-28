import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

const CONNECTION_COOKIE = "jevan_connection_id";
const STATE_COOKIE = "jevan_todoist_state";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

/** Returns the Todoist connection id for the given user if the cookie matches and belongs to that user. */
export async function getConnectionId(userId: string): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CONNECTION_COOKIE)?.value ?? null;
  if (!raw) return null;
  const { data } = await supabaseServer
    .from("todoist_connections")
    .select("id, user_id")
    .eq("id", raw)
    .single();
  if (!data || (data as { user_id: string | null }).user_id !== userId)
    return null;
  return (data as { id: string }).id;
}

/** Returns the Todoist access token for the given user if the connection exists and belongs to that user. */
export async function getConnectionToken(userId: string): Promise<string | null> {
  const connectionId = await getConnectionId(userId);
  if (!connectionId) return null;
  const { data } = await supabaseServer
    .from("todoist_connections")
    .select("access_token")
    .eq("id", connectionId)
    .single();
  return data?.access_token ?? null;
}

export function getConnectionCookieName(): string {
  return CONNECTION_COOKIE;
}

export function getStateCookieName(): string {
  return STATE_COOKIE;
}

export function connectionCookieOptions(): typeof COOKIE_OPTIONS {
  return COOKIE_OPTIONS;
}

export function stateCookieOptions(maxAge = 600): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    ...COOKIE_OPTIONS,
    maxAge,
  };
}
