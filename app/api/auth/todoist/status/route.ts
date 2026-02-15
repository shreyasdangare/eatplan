import { NextResponse } from "next/server";
import { getConnectionId } from "@/lib/todoistAuth";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const connectionId = await getConnectionId();
  if (!connectionId) {
    return NextResponse.json({ connected: false, project_id: null });
  }
  const { data } = await supabaseServer
    .from("todoist_connections")
    .select("project_id")
    .eq("id", connectionId)
    .single();
  const projectId = (data as { project_id: string | null } | null)?.project_id ?? null;
  return NextResponse.json({ connected: true, project_id: projectId });
}
