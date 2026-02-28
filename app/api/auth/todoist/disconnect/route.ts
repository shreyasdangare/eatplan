import { NextResponse } from "next/server";
import {
  getConnectionCookieName,
  connectionCookieOptions,
} from "@/lib/todoistAuth";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function POST() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getConnectionCookieName(), "", {
    ...connectionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
