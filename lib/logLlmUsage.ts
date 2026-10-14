import { supabaseServer } from "@/lib/supabaseServer";

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
