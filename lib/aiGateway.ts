import { generateText, Output, type ModelMessage } from "ai";

/**
 * Gemini calls go through Vercel AI Gateway (billed to the Vercel team).
 * Auth: on Vercel deployments the AI SDK uses the automatic VERCEL_OIDC_TOKEN;
 * locally, run `vercel env pull` (OIDC) or set AI_GATEWAY_API_KEY.
 * Model IDs must be `provider/model` strings from https://ai-gateway.vercel.sh/v1/models.
 */
export const RECIPE_MODEL =
  process.env.AI_GATEWAY_RECIPE_MODEL?.trim() || "google/gemini-3-flash";
export const RECIPE_VIDEO_MODEL =
  process.env.AI_GATEWAY_RECIPE_VIDEO_MODEL?.trim() || "google/gemini-3.5-flash-lite";
export const TRANSLATE_MODEL =
  process.env.AI_GATEWAY_TRANSLATE_MODEL?.trim() || "google/gemini-2.5-flash";

export type GatewayTokens = { input_tokens: number | null; output_tokens: number | null };

type GatewayCall = {
  model: string;
  system?: string;
  messages: ModelMessage[];
  temperature: number;
  maxOutputTokens: number;
  providerOptions?: Parameters<typeof generateText>[0]["providerOptions"];
};

function tokensOf(usage: { inputTokens?: number; outputTokens?: number } | undefined): GatewayTokens {
  return { input_tokens: usage?.inputTokens ?? null, output_tokens: usage?.outputTokens ?? null };
}

/** Text completion (replaces generateContent without responseMimeType). */
export async function gatewayText(call: GatewayCall): Promise<{ text: string; finishReason: string; tokens: GatewayTokens }> {
  const result = await generateText(call);
  return { text: result.text.trim(), finishReason: result.finishReason, tokens: tokensOf(result.usage) };
}

/** JSON-mode completion (replaces generateContent with responseMimeType: "application/json"). */
export async function gatewayJson<T>(call: GatewayCall): Promise<{ data: T; finishReason: string; tokens: GatewayTokens }> {
  const result = await generateText({ ...call, output: Output.json() });
  return { data: result.output as T, finishReason: result.finishReason, tokens: tokensOf(result.usage) };
}
