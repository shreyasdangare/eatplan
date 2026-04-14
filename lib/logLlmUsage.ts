import { supabaseServer } from "@/lib/supabaseServer";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

/**
 * Extracts token usage from a raw Gemini API response body.
 * Gemini responses include `usageMetadata` at the top level.
 */
export function extractGeminiTokens(responseBody: any): {
  input_tokens: number | null;
  output_tokens: number | null;
} {
  const usage = responseBody?.usageMetadata as GeminiUsageMetadata | undefined;
  return {
    input_tokens: usage?.promptTokenCount ?? null,
    output_tokens: usage?.candidatesTokenCount ?? null,
  };
}

/**
 * Logs an LLM API call to the `llm_usage_log` table.
 * Fire-and-forget — errors are logged but don't block the request.
 */
export async function logLlmUsage(params: {
  userId: string;
  householdId: string | null;
  endpoint: string;
  model: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
}): Promise<void> {
  try {
    const { error } = await supabaseServer.from("llm_usage_log").insert({
      user_id: params.userId,
      household_id: params.householdId,
      endpoint: params.endpoint,
      model: params.model,
      input_tokens: params.input_tokens ?? null,
      output_tokens: params.output_tokens ?? null,
    });
    if (error) {
      console.error("Failed to log LLM usage:", error);
    }
  } catch (err) {
    console.error("logLlmUsage error:", err);
  }
}
