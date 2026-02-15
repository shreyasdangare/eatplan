import { NextResponse } from "next/server";
import { getConnectionToken } from "@/lib/todoistAuth";

const TODOIST_SYNC_URL = "https://api.todoist.com/api/v1/sync";

export async function GET() {
  const token = await getConnectionToken();
  if (!token) {
    return NextResponse.json(
      { error: "Connect Todoist first" },
      { status: 401 }
    );
  }

  const body = new URLSearchParams({
    sync_token: "*",
    resource_types: JSON.stringify(["projects"]),
  });

  const res = await fetch(TODOIST_SYNC_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Todoist projects failed", res.status, errText);
    return NextResponse.json(
      { error: "Failed to fetch Todoist projects" },
      { status: 502 }
    );
  }

  const data = (await res.json()) as { projects?: { id: string; name: string }[] };
  const projects = data.projects ?? [];
  return NextResponse.json({
    projects: projects.map((p) => ({ id: p.id, name: p.name })),
  });
}
