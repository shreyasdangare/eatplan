import { NextResponse } from "next/server";
import {
  getConnectionCookieName,
  connectionCookieOptions,
} from "@/lib/todoistAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(getConnectionCookieName(), "", {
    ...connectionCookieOptions(),
    maxAge: 0,
  });
  return res;
}
