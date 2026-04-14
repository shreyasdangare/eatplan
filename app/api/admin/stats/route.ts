import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

const ADMIN_EMAIL = "shreyasdangare@gmail.com";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  if (auth.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 1. Get all users with their metadata
  const { data: usersData, error: usersError } = await supabaseServer.auth.admin.listUsers();
  if (usersError) {
    console.error("Error listing users:", usersError);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }

  const users = usersData?.users ?? [];

  // 2. Get per-household recipe and plan counts
  const { data: dishCounts } = await supabaseServer
    .from("dishes")
    .select("household_id");

  const { data: planCounts } = await supabaseServer
    .from("meal_plans")
    .select("household_id");

  const { data: memberships } = await supabaseServer
    .from("household_members")
    .select("user_id, household_id, role");

  // 3. Get LLM usage stats
  const { data: llmUsage } = await supabaseServer
    .from("llm_usage_log")
    .select("user_id, endpoint, model, input_tokens, output_tokens, created_at")
    .order("created_at", { ascending: false });

  // Build per-user stats
  const membershipMap = new Map<string, string[]>(); // user_id -> [household_ids]
  for (const m of memberships ?? []) {
    const arr = membershipMap.get(m.user_id) ?? [];
    arr.push(m.household_id);
    membershipMap.set(m.user_id, arr);
  }

  const dishCountMap = new Map<string, number>();
  for (const d of dishCounts ?? []) {
    dishCountMap.set(d.household_id, (dishCountMap.get(d.household_id) ?? 0) + 1);
  }

  const planCountMap = new Map<string, number>();
  for (const p of planCounts ?? []) {
    planCountMap.set(p.household_id, (planCountMap.get(p.household_id) ?? 0) + 1);
  }

  // LLM usage per user
  const llmByUser = new Map<string, { calls: number; input_tokens: number; output_tokens: number; last_used: string | null }>();
  for (const log of llmUsage ?? []) {
    const existing = llmByUser.get(log.user_id) ?? { calls: 0, input_tokens: 0, output_tokens: 0, last_used: null };
    existing.calls++;
    existing.input_tokens += log.input_tokens ?? 0;
    existing.output_tokens += log.output_tokens ?? 0;
    if (!existing.last_used || log.created_at > existing.last_used) {
      existing.last_used = log.created_at;
    }
    llmByUser.set(log.user_id, existing);
  }

  // LLM usage over last 30 days (per day)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dailyLlm: Record<string, number> = {};
  for (const log of llmUsage ?? []) {
    const d = new Date(log.created_at).toISOString().slice(0, 10);
    if (new Date(log.created_at) >= thirtyDaysAgo) {
      dailyLlm[d] = (dailyLlm[d] ?? 0) + 1;
    }
  }

  const userStats = users.map((u) => {
    const householdIds = membershipMap.get(u.id) ?? [];
    const recipes = householdIds.reduce((sum, hid) => sum + (dishCountMap.get(hid) ?? 0), 0);
    const plans = householdIds.reduce((sum, hid) => sum + (planCountMap.get(hid) ?? 0), 0);
    const llm = llmByUser.get(u.id) ?? { calls: 0, input_tokens: 0, output_tokens: 0, last_used: null };

    return {
      id: u.id,
      email: u.email ?? "—",
      name: u.user_metadata?.preferred_name ?? "—",
      language: u.user_metadata?.native_language ?? "—",
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      recipes,
      plans,
      llm,
    };
  });

  return NextResponse.json({
    users: userStats,
    dailyLlm,
    totals: {
      users: users.length,
      recipes: Array.from(dishCountMap.values()).reduce((a, b) => a + b, 0),
      plans: Array.from(planCountMap.values()).reduce((a, b) => a + b, 0),
      llmCalls: (llmUsage ?? []).length,
    },
  });
}
