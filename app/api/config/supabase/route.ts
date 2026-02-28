import { NextResponse } from "next/server";

/**
 * Returns public Supabase config so the client can create a Supabase client
 * when NEXT_PUBLIC_ vars are not available in the browser (e.g. env not inlined).
 * Only public URL and anon key are exposed.
 */
export async function GET() {
  const url = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    ""
  ).trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!url || !anonKey) {
    const missing: string[] = [];
    if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL");
    if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return NextResponse.json(
      {
        error: "Supabase config not set",
        hint: `Missing in .env.local: ${missing.join(", ")}. Put .env.local in the project root (same folder as package.json), then restart the dev server (npm run dev).`,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ supabaseUrl: url, supabaseAnonKey: anonKey });
}
