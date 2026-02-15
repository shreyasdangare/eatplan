import { supabaseServer } from "@/lib/supabaseServer";

type IngredientRow = { id: string; name: string };

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

/** Normalize task content: strip "buy " prefix, trim, lowercase for matching */
function normalizeContent(content: string): string {
  return content
    .replace(/^\s*buy\s+/i, "")
    .replace(/\s*\d+(\s*(g|kg|ml|L|oz|lb|cups?|tbsp|tsp)\b)?/gi, "")
    .trim()
    .toLowerCase();
}

/**
 * Find best-matching ingredient id for a task content string.
 * Returns null if no match above threshold.
 */
export async function matchContentToIngredientId(
  content: string
): Promise<string | null> {
  const normalized = normalizeContent(content);
  if (!normalized) return null;

  const { data: ingredients, error } = await supabaseServer
    .from("ingredients")
    .select("id, name");

  if (error || !ingredients?.length) return null;

  const scored = (ingredients as IngredientRow[]).map((ing) => {
    const nameLower = ing.name.toLowerCase();
    let score = 0;
    if (nameLower === normalized) score = 1;
    else if (nameLower.startsWith(normalized) || normalized.startsWith(nameLower))
      score = 0.85;
    else if (nameLower.includes(normalized) || normalized.includes(nameLower))
      score = 0.75;
    else score = similarity(nameLower, normalized);
    return { id: ing.id, name: ing.name, score };
  });

  const best = scored
    .filter((s) => s.score > 0.5)
    .sort((a, b) => b.score - a.score)[0];

  return best ? best.id : null;
}
