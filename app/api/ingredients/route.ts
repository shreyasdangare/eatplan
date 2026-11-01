import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const { data, error } = await supabaseServer
    .from("ingredients")
    .select("id, name, category")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredients", error);
    return NextResponse.json(
      { error: "Failed to fetch ingredients" },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const body = await req.json();
  const { name, category } = body as {
    name?: string;
    category?: string | null;
  };

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("ingredients")
    .insert({ name, category })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Error creating ingredient", error);
    return NextResponse.json(
      { error: "Failed to create ingredient" },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

