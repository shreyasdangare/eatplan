import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { supabaseServer } from "@/lib/supabaseServer";
import { logLlmUsage } from "@/lib/logLlmUsage";
import { gatewayJson, RECIPE_AUDIO_MODEL } from "@/lib/aiGateway";
import {
  MAX_AUDIO_BYTES,
  MIN_AUDIO_BYTES,
  VOICE_RATE_LIMIT,
  VOICE_SYSTEM_PROMPT,
  VOICE_USER_PROMPT,
  normalizeAudioMime,
  parseVoiceResult,
} from "@/lib/voiceRecipe";

export const runtime = "nodejs";
export const maxDuration = 120;

const ENDPOINT = "import-recipe-voice";

/** Counts this user's recent voice imports from the usage log (no extra table needed). */
async function rateLimited(userId: string): Promise<string | null> {
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (ms: number) => {
    const { count, error } = await supabaseServer
      .from("llm_usage_log")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("endpoint", ENDPOINT)
      .gte("created_at", since(ms));
    if (error) {
      console.error("voice rate-limit check failed", error);
      return 0; // fail open: the usage log is best-effort
    }
    return count ?? 0;
  };
  const [hour, day] = await Promise.all([count(3600_000), count(86_400_000)]);
  if (hour >= VOICE_RATE_LIMIT.perHour) return "You've recorded a lot of recipes this hour. Please try again in a little while.";
  if (day >= VOICE_RATE_LIMIT.perDay) return "You've reached today's limit for spoken recipes. Please try again tomorrow.";
  return null;
}

/**
 * POST multipart/form-data { audio: Blob } -> { recipe, transcript, language }.
 * One gateway call transcribes and structures the recipe. Nothing is saved here:
 * the client shows a review step and saves via POST /api/import-recipe { recipe }.
 * The audio lives only in memory for the duration of the request.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;
  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) return NextResponse.json({ error: "Household not found" }, { status: 403 });

  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_AUDIO_BYTES + 64_000) {
    return NextResponse.json({ error: "That recording is too long to upload. Try a shorter one (under 10 minutes)." }, { status: 413 });
  }

  const limited = await rateLimited(auth.user.id);
  if (limited) return NextResponse.json({ error: limited }, { status: 429, headers: { "Retry-After": "600" } });

  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("audio");
    if (!(f instanceof File)) throw new Error("missing");
    file = f;
  } catch {
    return NextResponse.json({ error: "No recording was received. Please try again." }, { status: 400 });
  }

  const mediaType = normalizeAudioMime(file.type);
  if (!mediaType) return NextResponse.json({ error: "This audio format isn't supported." }, { status: 415 });
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "That recording is too long to upload. Try a shorter one (under 10 minutes)." }, { status: 413 });
  }
  if (file.size < MIN_AUDIO_BYTES) {
    return NextResponse.json({ error: "That recording is too short. Hold the button and describe your recipe." }, { status: 400 });
  }

  const audio = new Uint8Array(await file.arrayBuffer());
  let raw: unknown;
  try {
    const result = await gatewayJson<unknown>({
      model: RECIPE_AUDIO_MODEL,
      system: VOICE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "file", mediaType, data: audio },
            { type: "text", text: VOICE_USER_PROMPT },
          ],
        },
      ],
      temperature: 0.2,
      maxOutputTokens: 8192,
    });
    raw = result.data;
    logLlmUsage({
      userId: auth.user.id,
      householdId,
      endpoint: ENDPOINT,
      model: RECIPE_AUDIO_MODEL,
      input_tokens: result.tokens.input_tokens,
      output_tokens: result.tokens.output_tokens,
    });
    if (result.finishReason === "content-filter") {
      return NextResponse.json({ error: "The recording couldn't be processed. Please try again." }, { status: 422 });
    }
  } catch (e) {
    console.error("Voice recipe gateway error", e);
    return NextResponse.json({ error: "Our recipe helper is busy right now. Please try again." }, { status: 502 });
  }

  try {
    return NextResponse.json(parseVoiceResult(raw));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "No recipe found" }, { status: 422 });
  }
}
