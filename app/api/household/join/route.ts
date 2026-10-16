import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { normalizeInviteCode } from "@/lib/inviteCode";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code = typeof body.code === "string" ? normalizeInviteCode(body.code) : "";
  if (code.length < 6 || code.length > 16) {
    return NextResponse.json({ error: "Enter the invite code you were sent" }, { status: 400 });
  }

  // Atomic: move membership and delete the old household if the user was its last member (migration 024).
  const { data, error } = await supabaseServer.rpc("join_household_by_code", {
    p_user_id: auth.user.id,
    p_code: code,
  });

  if (error) {
    if (error.code === "P0002") {
      return NextResponse.json({ error: "That invite code isn't valid. Ask for a new one." }, { status: 404 });
    }
    console.error("Join error", error);
    return NextResponse.json({ error: "Failed to join household" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, householdId: data });
}
