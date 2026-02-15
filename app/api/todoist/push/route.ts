import { NextRequest, NextResponse } from "next/server";
import { getConnectionId, getConnectionToken } from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";

// Use api/v1 (rest/v1 and rest/v2 are deprecated and return 410)
const TODOIST_TASKS_URL = "https://api.todoist.com/api/v1/tasks";

type ToBuyItem = {
  ingredient_name: string;
  quantity_display?: string;
};

export async function POST(req: NextRequest) {
  const connectionId = await getConnectionId();
  if (!connectionId) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
  }

  const token = await getConnectionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Todoist connection not found" },
      { status: 401 }
    );
  }

  const body = (await req.json()) as {
    to_buy?: ToBuyItem[];
    project_id?: string;
  };

  const toBuy = body.to_buy ?? [];
  let projectId = body.project_id;

  if (!projectId) {
    const { data: conn } = await supabaseServer
      .from("todoist_connections")
      .select("project_id")
      .eq("id", connectionId)
      .single();
    projectId = (conn as { project_id: string | null } | null)?.project_id ?? null;
  }

  if (!projectId) {
    return NextResponse.json(
      { error: "Select a Todoist project (or pass project_id)" },
      { status: 400 }
    );
  }

  if (projectId) {
    await supabaseServer
      .from("todoist_connections")
      .update({ project_id: projectId })
      .eq("id", connectionId);
  }

  const created: string[] = [];
  const failed: string[] = [];

  for (const item of toBuy) {
    const content =
      item.quantity_display?.trim()
        ? `${item.ingredient_name} – ${item.quantity_display}`
        : `Buy ${item.ingredient_name}`;

    // REST v2: project_id is a string
    const res = await fetch(TODOIST_TASKS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content,
        project_id: String(projectId),
      }),
    });

    if (res.ok) {
      created.push(item.ingredient_name);
    } else {
      const errText = await res.text();
      console.error("Todoist create task failed", res.status, content, errText);
      failed.push(item.ingredient_name);
    }
  }

  return NextResponse.json({
    ok: true,
    created: created.length,
    failed: failed.length,
    created_items: created,
    failed_items: failed,
  });
}
