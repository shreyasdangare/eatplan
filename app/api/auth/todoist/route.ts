import { NextRequest, NextResponse } from "next/server";
import { getStateCookieName, stateCookieOptions } from "@/lib/todoistAuth";
import { requireAuth } from "@/lib/supabaseServerClient";

const TODOIST_AUTH_URL = "https://api.todoist.com/oauth/authorize";
const SCOPES = "data:read_write";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const clientId = process.env.TODOIST_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "Todoist integration not configured" },
      { status: 503 }
    );
  }

  const state = crypto.randomUUID();
  const redirectUri = getRedirectUri(req);
  const params = new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    state,
    redirect_uri: redirectUri,
  });

  const res = NextResponse.redirect(`${TODOIST_AUTH_URL}?${params.toString()}`);
  res.cookies.set(getStateCookieName(), state, stateCookieOptions());
  return res;
}

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/auth/todoist/callback`;
}
