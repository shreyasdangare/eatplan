import { NextRequest, NextResponse } from "next/server";
import {
  getStateCookieName,
  getConnectionCookieName,
  stateCookieOptions,
  connectionCookieOptions,
} from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";

const TODOIST_TOKEN_URL = "https://api.todoist.com/oauth/access_token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    const res = NextResponse.redirect(new URL("/shopping-list?error=denied", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  if (!code || !state) {
    const res = NextResponse.redirect(new URL("/shopping-list?error=missing", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  const store = await import("next/headers").then((m) => m.cookies());
  const storedState = store.get(getStateCookieName())?.value;
  if (!storedState || storedState !== state) {
    const res = NextResponse.redirect(new URL("/shopping-list?error=invalid_state", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  const clientId = process.env.TODOIST_CLIENT_ID;
  const clientSecret = process.env.TODOIST_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    const res = NextResponse.redirect(new URL("/shopping-list?error=config", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  const redirectUri = getRedirectUri(req);
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(TODOIST_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Todoist token exchange failed", tokenRes.status, errText);
    const res = NextResponse.redirect(new URL("/shopping-list?error=token", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  const data = (await tokenRes.json()) as { access_token: string };
  const accessToken = data.access_token;
  if (!accessToken) {
    const res = NextResponse.redirect(new URL("/shopping-list?error=token", req.url));
    res.cookies.delete(getStateCookieName());
    return res;
  }

  const { data: existing } = await supabaseServer
    .from("todoist_connections")
    .select("id")
    .eq("access_token", accessToken)
    .maybeSingle();

  let connectionId: string;
  if (existing) {
    connectionId = existing.id;
  } else {
    const { data: inserted, error } = await supabaseServer
      .from("todoist_connections")
      .insert({ access_token: accessToken })
      .select("id")
      .single();
    if (error || !inserted) {
      console.error("Insert todoist_connection error", error);
      const res = NextResponse.redirect(new URL("/shopping-list?error=db", req.url));
      res.cookies.delete(getStateCookieName());
      return res;
    }
    connectionId = inserted.id;
  }

  const res = NextResponse.redirect(new URL("/shopping-list", req.url));
  res.cookies.delete(getStateCookieName());
  res.cookies.set(getConnectionCookieName(), connectionId, connectionCookieOptions());
  return res;
}

function getRedirectUri(req: NextRequest): string {
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/auth/todoist/callback`;
}
