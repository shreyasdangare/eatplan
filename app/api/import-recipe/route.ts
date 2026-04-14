import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseServer } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { fetchImageUrlForRecipe } from "@/lib/recipeImages";
import { logLlmUsage, extractGeminiTokens } from "@/lib/logLlmUsage";

type ExtractedIngredient = {
  name: string;
  quantity?: string;
  amount?: number;
  unit?: string;
};

type ExtractedRecipe = {
  name: string;
  description?: string;
  ingredients?: ExtractedIngredient[];
  servings?: number;
  instructions?: string;
};

async function fetchPageText(url: string): Promise<{ text: string; imageUrl: string | null }> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; EatPlanRecipeBot/1.0)"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const ogImage = $('meta[property="og:image"]').attr("content") ||
                  $('meta[name="twitter:image"]').attr("content") ||
                  null;

  $("script, style, nav, footer, header").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return { text: text.slice(0, 15000), imageUrl: ogImage || null };
}

const RECIPE_SYSTEM_PROMPT = `You extract recipe data from web page text. Reply with ONLY a valid JSON object, no markdown or explanation.
Use this shape:
{
  "name": "Normalized Recipe Title (strip all adjectives like 'Authentic', 'Best', 'Easy', 'Dilli Vali' to just the core dish name, e.g. 'Dal Makhni')",
  "description": "Short description or leave empty",
  "servings": number or null,
  "ingredients": [
    { "name": "ingredient name", "quantity": "2 cups", "amount": 2, "unit": "cups" }
  ],
  "instructions": "Full cooking steps as a single string. Use numbered steps (1. ... 2. ...) or clear paragraphs. Include all steps from the recipe. If no steps are found, use empty string."
}
For each ingredient: "name" is required. Use "quantity" as display string (e.g. "2 cups"). If numeric, also set "amount" and "unit".
Always include "instructions" with the complete method/steps to cook the dish.`;

const SCREENSHOT_USER_PROMPT = `Extract the recipe from this image (screenshot or photo). Use OCR to read all text. Reply with ONLY a valid JSON object in the same shape: name, description, servings, ingredients (each with name, quantity, amount, unit), and instructions as a single string with full cooking steps.`;

const VIDEO_USER_PROMPT = `Extract the recipe from this cooking video (e.g. reel, tutorial). Use what you see and hear: on-screen text, spoken instructions, and visuals. Reply with ONLY a valid JSON object in the same shape: name, description, servings, ingredients (each with name, quantity, amount, unit), and instructions as a single string with full cooking steps.`;

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

async function extractWithGeminiFromImage(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<{ recipe: ExtractedRecipe; rawResponse: any }> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: RECIPE_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: SCREENSHOT_USER_PROMPT }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return { recipe: JSON.parse(jsonStr) as ExtractedRecipe, rawResponse: data };
}

async function extractWithGemini(text: string, apiKey: string): Promise<{ recipe: ExtractedRecipe; rawResponse: any }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: RECIPE_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Extract the recipe from this text:\n\n${text.slice(0, 12000)}` }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return { recipe: JSON.parse(jsonStr) as ExtractedRecipe, rawResponse: data };
}

async function generateWithGeminiByName(recipeName: string, apiKey: string): Promise<{ recipe: ExtractedRecipe; rawResponse: any }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: "You are an expert chef. Generate recipe data to a JSON object. No markdown. Use this shape:\n{\n  \"name\": \"Normalized Recipe Title (strip all adjectives like 'Authentic', 'Best', 'Easy', 'Dilli Vali' to just the core dish name, e.g. 'Dal Makhni')\",\n  \"description\": \"Short description\",\n  \"servings\": number,\n  \"ingredients\": [\n    { \"name\": \"ingredient name\", \"quantity\": \"2 cups\", \"amount\": 2, \"unit\": \"cups\" }\n  ],\n  \"instructions\": \"Full cooking steps as a single string. Use numbered steps (1. ... 2. ...).\"\n}\nAlways include instructions." }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Generate a highly-rated, authentic, and detailed recipe for "${recipeName}". The ingredient quantities MUST be scaled perfectly for exactly 2 people. Set servings to 2. Reply with ONLY a valid JSON object matching the system instructions shape.` }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  const jsonStr = raw.replace(/^[\`\s]*json?/i, "").replace(/[\s\`]*$/i, "").trim();
  return { recipe: JSON.parse(jsonStr) as ExtractedRecipe, rawResponse: data };
}

function isYouTubeUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();
  if (host === "www.youtube.com" || host === "youtube.com") {
    return (
      path === "/watch" ||
      path.startsWith("/embed/") ||
      path.startsWith("/v/") ||
      path.startsWith("/shorts/")
    );
  }
  if (host === "youtu.be") {
    return path.length > 1;
  }
  return false;
}

function normalizeYouTubeUrl(url: URL): string {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0].split("?")[0];
    return id ? `https://www.youtube.com/watch?v=${id}` : url.href;
  }
  if (host === "www.youtube.com" || host === "youtube.com") {
    const path = url.pathname;
    const shortsMatch = path.match(/^\/shorts\/([^/?]+)/i);
    if (shortsMatch) {
      return `https://www.youtube.com/watch?v=${shortsMatch[1]}`;
    }
  }
  return url.href;
}

async function extractWithGeminiFromYouTube(
  youtubeUrl: string,
  apiKey: string
): Promise<{ recipe: ExtractedRecipe; rawResponse: any }> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: RECIPE_SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              fileData: {
                mimeType: "video/youtube",
                fileUri: youtubeUrl
              }
            },
            { text: VIDEO_USER_PROMPT }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000,
        responseMimeType: "application/json"
      }
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as any;
  const candidate = data.candidates?.[0];
  const blockReason = data.promptFeedback?.blockReason ?? candidate?.finishReason;
  if (blockReason === "SAFETY" || blockReason === "RECITATION" || blockReason === "BLOCKED") {
    throw new Error("Video was blocked by the model. Try a different video.");
  }
  const raw = candidate?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!raw) {
    throw new Error("No recipe could be extracted from the video. The model returned no content.");
  }
  const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  let recipe: ExtractedRecipe;
  try {
    recipe = JSON.parse(jsonStr) as ExtractedRecipe;
  } catch {
    throw new Error("Could not parse recipe from video. Try a different video or link.");
  }
  return { recipe, rawResponse: data };
}

function isErrorLikeRecipe(recipe: ExtractedRecipe): boolean {
  const name = (recipe.name ?? "").trim().toLowerCase();
  const noIngredients = !recipe.ingredients?.length;
  const noInstructions = !(recipe.instructions ?? "").trim();
  const errorPhrases = [
    "no recipe",
    "could not",
    "unable to",
    "not found",
    "cannot extract",
    "couldn't extract",
    "no content",
    "did not find",
    "unable to find"
  ];
  if (errorPhrases.some((p) => name.includes(p))) return true;
  if (noIngredients && noInstructions) return true;
  return false;
}

async function saveExtractedRecipe(
  recipe: ExtractedRecipe,
  householdId: string,
  imageUrl?: string | null
): Promise<{ id: string; name: string }> {
  const ingredients = recipe.ingredients ?? [];
  const ingredientIds: { id: string; name: string }[] = [];

  for (const ing of ingredients) {
    const name = (ing.name ?? "").trim();
    if (!name) continue;
    const { data: existing } = await supabaseServer
      .from("ingredients")
      .select("id")
      .ilike("name", name)
      .maybeSingle();

    let id: string;
    if (existing) {
      id = existing.id;
    } else {
      const { data: inserted, error } = await supabaseServer
        .from("ingredients")
        .insert({ name })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error("Insert ingredient error", error);
        continue;
      }
      id = inserted.id;
    }
    ingredientIds.push({ id, name });
  }

  const { data: dish, error: dishError } = await supabaseServer
    .from("dishes")
    .insert({
      household_id: householdId,
      name: recipe.name.trim(),
      description: recipe.description?.trim() || null,
      meal_type: "both",
      prep_time_minutes: null,
      tags: [],
      servings: recipe.servings ?? null,
      instructions: recipe.instructions?.trim() || null,
      image_url: imageUrl ?? null
    })
    .select("id")
    .single();

  if (dishError || !dish) {
    console.error("Insert dish error", dishError);
    const message =
      dishError?.message ?? "Unknown error";
    throw new Error(message);
  }

  const rows = ingredients
    .map((ing) => {
      const name = (ing.name ?? "").trim();
      const pair = ingredientIds.find((x) => x.name === name);
      if (!pair) return null;
      return {
        dish_id: dish.id,
        ingredient_id: pair.id,
        quantity: ing.quantity ?? null,
        amount: ing.amount ?? null,
        unit: ing.unit ?? null,
        is_optional: false
      };
    })
    .filter(Boolean);

  if (rows.length > 0) {
    await supabaseServer.from("dish_ingredients").insert(rows);
  }

  return { id: dish.id, name: recipe.name.trim() };
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const householdId = await getHouseholdId(auth.user.id);
  if (!householdId) {
    return NextResponse.json({ error: "Household not found" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const geminiKey = process.env.GOOGLE_GEMINI_API_KEY?.trim();

  let recipe: ExtractedRecipe;
  let pageImageUrl: string | null = null;
  let geminiRawResponse: any = null;
  let geminiEndpoint = "import-recipe";
  const geminiModel = "gemini-3-flash-preview";

  if (contentType.includes("multipart/form-data")) {
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Screenshot import requires GOOGLE_GEMINI_API_KEY." },
        { status: 400 }
      );
    }
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required (image)" },
        { status: 400 }
      );
    }
    const type = (file.type?.toLowerCase() ?? "").replace(/^image\/jpg$/, "image/jpeg");
    if (!ALLOWED_IMAGE_TYPES.includes(type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        { error: "Image must be PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }
    const buf = await file.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "Image must be 10MB or smaller." },
        { status: 400 }
      );
    }
    const imageBase64 = Buffer.from(buf).toString("base64");
    const mimeType = type;
    try {
      const result = await extractWithGeminiFromImage(imageBase64, mimeType, geminiKey);
      recipe = result.recipe;
      geminiRawResponse = result.rawResponse;
      geminiEndpoint = "import-recipe-image";
    } catch (e) {
      console.error("Screenshot extract error", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Failed to extract recipe from image"
        },
        { status: 502 }
      );
    }
  } else {
    const body = (await req.json().catch(() => ({}))) as { url?: string; recipeName?: string };
    const { url, recipeName } = body;

    if (recipeName && typeof recipeName === "string") {
      if (!geminiKey) return NextResponse.json({ error: "Requires GOOGLE_GEMINI_API_KEY." }, { status: 400 });
      try {
        const [recipeResult, spoonUrl] = await Promise.all([
          generateWithGeminiByName(recipeName.trim(), geminiKey),
          fetchImageUrlForRecipe(recipeName.trim())
        ]);
        recipe = recipeResult.recipe;
        geminiRawResponse = recipeResult.rawResponse;
        geminiEndpoint = "import-recipe-generate";
        pageImageUrl = spoonUrl;
      } catch (e) {
        console.error("Recipe generation error", e);
        return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to generate recipe" }, { status: 502 });
      }
    } else {
      if (!url || typeof url !== "string") {
        return NextResponse.json(
          { error: "url or recipeName is required" },
          { status: 400 }
        );
      }

    let targetUrl: URL;
    try {
      targetUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return NextResponse.json(
        { error: "URL must be http or https" },
        { status: 400 }
      );
    }

    if (!geminiKey) {
      return NextResponse.json(
        { error: "Recipe import requires GOOGLE_GEMINI_API_KEY in server environment." },
        { status: 400 }
      );
    }

    if (isYouTubeUrl(targetUrl)) {
      const youtubeUrl = normalizeYouTubeUrl(targetUrl);
      try {
        const ytResult = await extractWithGeminiFromYouTube(youtubeUrl, geminiKey);
        recipe = ytResult.recipe;
        geminiRawResponse = ytResult.rawResponse;
        geminiEndpoint = "import-recipe-youtube";
      } catch (e) {
        console.error("YouTube recipe extract error", e);
        return NextResponse.json(
          {
            error:
              e instanceof Error ? e.message : "Failed to extract recipe from YouTube video"
          },
          { status: 502 }
        );
      }
    } else {
      let text: string;
      try {
        const pageData = await fetchPageText(targetUrl.href);
        text = pageData.text;
        pageImageUrl = pageData.imageUrl;
      } catch (e) {
        console.error("Fetch error", e);
        return NextResponse.json(
          { error: "Failed to fetch URL or extract text" },
          { status: 422 }
        );
      }

      if (text.length < 100) {
        return NextResponse.json(
          { error: "Page has too little text to parse as a recipe" },
          { status: 422 }
        );
      }

      try {
        const urlResult = await extractWithGemini(text, geminiKey);
        recipe = urlResult.recipe;
        geminiRawResponse = urlResult.rawResponse;
        geminiEndpoint = "import-recipe-url";
      } catch (e) {
        console.error("Recipe extract error", e);
        return NextResponse.json(
          {
            error:
              e instanceof Error ? e.message : "Failed to extract recipe with AI"
          },
          { status: 502 }
        );
      }
    }
    }
  }

  if (!recipe.name?.trim()) {
    return NextResponse.json(
      { error: "Could not extract recipe name" },
      { status: 422 }
    );
  }

  if (isErrorLikeRecipe(recipe)) {
    console.warn("Recipe import rejected (error-like response):", recipe.name?.slice(0, 80));
    return NextResponse.json(
      {
        error:
          "No recipe could be extracted from this video. Try a different link or ensure the video shows a clear recipe (ingredients and steps)."
      },
      { status: 422 }
    );
  }

  const imageUrl = pageImageUrl || await fetchImageUrlForRecipe(recipe.name);

  // Log LLM usage (fire-and-forget)
  if (geminiRawResponse) {
    const tokens = extractGeminiTokens(geminiRawResponse);
    logLlmUsage({
      userId: auth.user.id,
      householdId,
      endpoint: geminiEndpoint,
      model: geminiModel,
      input_tokens: tokens.input_tokens,
      output_tokens: tokens.output_tokens,
    });
  }

  try {
    const result = await saveExtractedRecipe(recipe, householdId, imageUrl);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error("Save recipe error", e);
    const message =
      e instanceof Error ? e.message : "Failed to create dish";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
