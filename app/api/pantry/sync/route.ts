import { NextRequest, NextResponse } from "next/server";
import { getConnectionId, getConnectionToken } from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";
import { matchContentToIngredientId } from "@/lib/ingredientMatch";
import { requireAuth } from "@/lib/supabaseServerClient";

// API v1 (unified): completed tasks - use /api/v1/ prefix per deprecation notice
const TODOIST_COMPLETED_URL =
  "https://api.todoist.com/api/v1/tasks/completed";

type TodoistCompletedItem = { content: string };

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const connectionId = await getConnectionId(auth.user.id);
  if (!connectionId) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as { project_id?: string };
  const projectId = body?.project_id;
  if (!projectId) {
    return NextResponse.json(
      { error: "project_id is required" },
      { status: 400 }
    );
  }

  const token = await getConnectionToken(auth.user.id);
  if (!token) {
    return NextResponse.json(
      { error: "Todoist connection not found" },
      { status: 401 }
    );
  }

  // REST v1: GET .../tasks/completed?project_id=xxx (and optionally since for pagination)
  const url = new URL(TODOIST_COMPLETED_URL);
  url.searchParams.set("project_id", projectId);

  const syncRes = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!syncRes.ok) {
    const errText = await syncRes.text();
    console.error("Todoist completed tasks failed", syncRes.status, errText);
    return NextResponse.json(
      { error: "Failed to fetch completed tasks from Todoist" },
      { status: 502 }
    );
  }

  const data = (await syncRes.json()) as
    | { items?: TodoistCompletedItem[] }
    | TodoistCompletedItem[];
  const items = Array.isArray(data) ? data : (data.items ?? []);

  const added: string[] = [];
  const skipped: string[] = [];

  for (const item of items) {
    const content = (item.content ?? "").trim();
    if (!content) continue;

    const ingredientId = await matchContentToIngredientId(content);
    if (!ingredientId) {
      skipped.push(content);
      continue;
    }

    const { error } = await supabaseServer.from("pantry").upsert(
      {
        connection_id: connectionId,
        ingredient_id: ingredientId,
        amount: 1,
        unit: null,
      },
      { onConflict: "connection_id,ingredient_id" }
    );
    if (!error) added.push(content);
  }

  return NextResponse.json({
    ok: true,
    added: added.length,
    skipped: skipped.length,
    skipped_samples: skipped.slice(0, 10),
  });
}
