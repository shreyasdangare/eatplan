import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type IngredientRecord = {
  id: string;
  name: string;
};

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - dist / maxLen;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = (searchParams.get("query") || "").trim();

  if (!query) {
    return NextResponse.json({ ingredients: [] });
  }

  const { data, error } = await supabaseServer
    .from("ingredients")
    .select("id, name");

  if (error || !data) {
    console.error("Error fetching ingredients for search", error);
    return NextResponse.json(
      { error: "Failed to search ingredients" },
      { status: 500 }
    );
  }

  const lowerQuery = query.toLowerCase();

  const scored = (data as IngredientRecord[]).map((ing) => {
    const nameLower = ing.name.toLowerCase();
    let score = 0;

    if (nameLower === lowerQuery) {
      score = 1;
    } else if (nameLower.startsWith(lowerQuery)) {
      score = 0.95;
    } else if (nameLower.includes(lowerQuery)) {
      score = 0.9;
    } else {
      score = similarity(nameLower, lowerQuery);
    }

    return { ...ing, score };
  });

  const filtered = scored
    .filter((item) => item.score > 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  return NextResponse.json({
    ingredients: filtered
  });
}

