/**
 * Shared helpers for "Speak a recipe": audio validation, the model prompt and
 * normalisation of the model's JSON into the recipe shape every import path uses.
 * Pure functions (no server imports) so they're unit-testable and usable client-side.
 */

export type RecipeIngredient = { name: string; quantity?: string; amount?: number; unit?: string };
export type ParsedRecipe = {
  name: string;
  description?: string;
  servings?: number;
  prep_time_minutes?: number;
  ingredients: RecipeIngredient[];
  instructions: string;
};
export type VoiceResult = { recipe: ParsedRecipe; transcript: string; language?: string };

export const MAX_RECORDING_SECONDS = 600;
export const RECORDING_WARN_SECONDS = 540;
/** Vercel functions accept ~4.5 MB request bodies; keep headroom for multipart overhead. */
export const MAX_AUDIO_BYTES = 4_300_000;
export const MIN_AUDIO_BYTES = 1_000;
export const VOICE_RATE_LIMIT = { perHour: 10, perDay: 30 };

/** Recorder preference order: Chrome/Firefox give webm/opus, iOS Safari mp4/aac. */
export const RECORDER_MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/aac",
] as const;

export function pickRecorderMime(isSupported: (t: string) => boolean): string | undefined {
  return RECORDER_MIME_CANDIDATES.find((t) => {
    try {
      return isSupported(t);
    } catch {
      return false;
    }
  });
}

const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "audio/webm",
  "video/webm": "audio/webm",
  "audio/mp4": "audio/mp4",
  "video/mp4": "audio/mp4",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/aac": "audio/aac",
  "audio/ogg": "audio/ogg",
  "audio/mpeg": "audio/mpeg",
  "audio/mp3": "audio/mpeg",
  "audio/wav": "audio/wav",
  "audio/x-wav": "audio/wav",
};

/** Strip codec params and map aliases to the media type we send the model; null if unsupported. */
export function normalizeAudioMime(type: string | null | undefined): string | null {
  const base = (type ?? "").split(";")[0].trim().toLowerCase();
  return AUDIO_TYPES[base] ?? null;
}

export const VOICE_SYSTEM_PROMPT = `You are a careful kitchen assistant. The user recorded themselves describing a recipe out loud.
They may speak English, Hindi, Marathi, or a mix (Hinglish), and may ramble, repeat or correct themselves ("no wait, two spoons").
Do both steps in one go:
1. Transcribe the audio faithfully (keep the original language; Devanagari or romanised as spoken).
2. Turn it into a clean recipe in ENGLISH.
Rules:
- Use the final version when the speaker corrects themselves. Never invent ingredients or steps that were not said; you may add obvious missing words for readability.
- Ingredient names in English, with a common Indian name in brackets when helpful, e.g. "Turmeric (haldi)", "Fenugreek leaves (methi)".
- Normalise quantities: words to numbers (adha/ardha = 0.5, paav = 0.25, sava = 1.25, dedh/didh = 1.5, dhai/adich = 2.5, ek=1, do/don=2, teen=3, char/chaar=4).
- Units: tsp, tbsp, cup, g, kg, ml, l, pinch, pc, clove, inch, bunch, to taste. chammach/chamcha = tsp unless "bada"/"mota" (tbsp); katori/vati = cup; mutthi = handful.
- "quantity" is a short display string like "1.5 cup" or "to taste"; set numeric "amount" and "unit" when there is a number.
- Name: the core dish name without adjectives ("Aai's Special Pohe" -> "Kanda Poha"). If not said, infer it from the ingredients and method.
- Instructions: numbered steps "1. ...\\n2. ..." in English.
- If the audio contains no recipe (silence, noise, unrelated talk), return name "" and empty ingredients.
Reply with ONLY a JSON object:
{"transcript": string, "language": "en"|"hi"|"mr"|"mixed", "name": string, "description": string, "servings": number|null, "prep_time_minutes": number|null,
 "ingredients": [{"name": string, "quantity": string, "amount": number|null, "unit": string|null}], "instructions": string}`;

export const VOICE_USER_PROMPT = "Here is my recipe recording. Transcribe it and structure it as instructed.";

const UNIT_ALIASES: Record<string, string> = {
  teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp", tsps: "tsp", t: "tsp", chammach: "tsp", chamach: "tsp", chamcha: "tsp", spoon: "tsp", spoons: "tsp",
  tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", tbsps: "tbsp", tbs: "tbsp", tbl: "tbsp",
  cup: "cup", cups: "cup", katori: "cup", katoris: "cup", vati: "cup", wati: "cup",
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g", gr: "g",
  kg: "kg", kgs: "kg", kilo: "kg", kilos: "kg", kilogram: "kg", kilograms: "kg",
  ml: "ml", milliliter: "ml", milliliters: "ml", millilitre: "ml", millilitres: "ml",
  l: "l", liter: "l", liters: "l", litre: "l", litres: "l", ltr: "l",
  pinch: "pinch", pinches: "pinch", chutki: "pinch",
  pc: "pc", pcs: "pc", piece: "pc", pieces: "pc", nos: "pc", no: "pc", whole: "pc",
  clove: "clove", cloves: "clove", inch: "inch", inches: "inch", bunch: "bunch", bunches: "bunch",
  handful: "handful", handfuls: "handful", mutthi: "handful",
};

export function normalizeUnit(unit: unknown): string | undefined {
  if (typeof unit !== "string") return undefined;
  const u = unit.trim().toLowerCase().replace(/\.$/, "");
  if (!u) return undefined;
  return UNIT_ALIASES[u] ?? u;
}

const UNICODE_FRACTIONS: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125 };

/** Parses 2, "2", "1.5", "1/2", "1 1/2", "1½", "½"; returns undefined for anything else or non-positive. */
export function parseAmount(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? Math.round(value * 1000) / 1000 : undefined;
  if (typeof value !== "string") return undefined;
  let s = value.trim();
  if (!s) return undefined;
  let total = 0;
  for (const [ch, n] of Object.entries(UNICODE_FRACTIONS)) {
    if (s.includes(ch)) {
      total += n;
      s = s.replace(ch, " ").trim();
    }
  }
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) total += Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  else if (/^\d+\/\d+$/.test(s)) {
    const [a, b] = s.split("/").map(Number);
    if (!b) return undefined;
    total += a / b;
  } else if (/^\d+(\.\d+)?$/.test(s)) total += Number(s);
  else if (s) return undefined;
  return total > 0 ? Math.round(total * 1000) / 1000 : undefined;
}

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+\n/g, "\n").trim().slice(0, max) : "";
}

function positiveInt(v: unknown, max: number): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= max ? Math.round(n) : undefined;
}

/** Validates and cleans model (or client-edited) JSON into a ParsedRecipe. Throws on unusable input. */
export function normalizeRecipe(raw: unknown): ParsedRecipe {
  if (!raw || typeof raw !== "object") throw new Error("Recipe must be an object");
  const r = raw as Record<string, unknown>;
  const name = str(r.name, 120);
  const seen = new Set<string>();
  const ingredients: RecipeIngredient[] = (Array.isArray(r.ingredients) ? r.ingredients : [])
    .slice(0, 60)
    .map((i): RecipeIngredient | null => {
      if (typeof i === "string") i = { name: i };
      if (!i || typeof i !== "object") return null;
      const o = i as Record<string, unknown>;
      const ingName = str(o.name, 80);
      if (!ingName || seen.has(ingName.toLowerCase())) return null;
      seen.add(ingName.toLowerCase());
      const amount = parseAmount(o.amount);
      const unit = normalizeUnit(o.unit);
      const quantity = str(o.quantity, 40) || (amount ? [amount, unit].filter(Boolean).join(" ") : "");
      return {
        name: ingName,
        ...(quantity ? { quantity } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(unit ? { unit } : {}),
      };
    })
    .filter((i): i is RecipeIngredient => i !== null);
  const instructions = str(r.instructions, 8000);
  if (!name) throw new Error("No recipe name");
  if (ingredients.length === 0 && !instructions) throw new Error("No ingredients or steps");
  const description = str(r.description, 400);
  const servings = positiveInt(r.servings, 50);
  const prep = positiveInt(r.prep_time_minutes, 24 * 60);
  return {
    name,
    ...(description ? { description } : {}),
    ...(servings ? { servings } : {}),
    ...(prep ? { prep_time_minutes: prep } : {}),
    ingredients,
    instructions,
  };
}

/** Parses the model's voice reply into recipe + transcript; throws a user-facing message when there's no recipe. */
export function parseVoiceResult(raw: unknown): VoiceResult {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const transcript = str(r.transcript, 20000);
  let recipe: ParsedRecipe;
  try {
    recipe = normalizeRecipe(r);
  } catch {
    throw new Error(
      transcript
        ? "We heard you, but couldn't find a recipe in it. Try naming the dish, then the ingredients and steps."
        : "We couldn't hear anything. Check your microphone and try again."
    );
  }
  const language = typeof r.language === "string" ? r.language.slice(0, 10) : undefined;
  return { recipe, transcript, ...(language ? { language } : {}) };
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
