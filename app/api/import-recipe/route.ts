import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { supabaseServer } from "@/lib/supabaseServer";

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
};

async function fetchPageText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; JevanRecipeBot/1.0)"
    },
    signal: AbortSignal.timeout(15000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, header").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim();
  return text.slice(0, 15000);
}

async function extractWithOpenAI(
  text: string,
  apiKey: string
): Promise<ExtractedRecipe> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You extract recipe data from web page text. Reply with ONLY a valid JSON object, no markdown or explanation.
Use this shape:
{
  "name": "Recipe title",
  "description": "Short description or leave empty",
  "servings": number or null,
  "ingredients": [
    { "name": "ingredient name", "quantity": "2 cups", "amount": 2, "unit": "cups" }
  ]
}
For each ingredient: "name" is required. Use "quantity" as display string (e.g. "2 cups"). If numeric, also set "amount" and "unit".`
        },
        {
          role: "user",
          content: `Extract the recipe from this text:\n\n${text.slice(0, 12000)}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.2
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw =
    data.choices?.[0]?.message?.content?.trim() ?? "";
  const jsonStr = raw.replace(/^```json?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(jsonStr) as ExtractedRecipe;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    url: string;
    api_key?: string;
  };
  const { url, api_key } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json(
      { error: "url is required" },
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

  const apiKey = api_key?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OpenAI API key required. Set OPENAI_API_KEY in environment or pass api_key in the request."
      },
      { status: 400 }
    );
  }

  let text: string;
  try {
    text = await fetchPageText(targetUrl.href);
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

  let recipe: ExtractedRecipe;
  try {
    recipe = await extractWithOpenAI(text, apiKey);
  } catch (e) {
    console.error("OpenAI extract error", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to extract recipe with AI"
      },
      { status: 502 }
    );
  }

  if (!recipe.name?.trim()) {
    return NextResponse.json(
      { error: "Could not extract recipe name" },
      { status: 422 }
    );
  }

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
      name: recipe.name.trim(),
      description: recipe.description?.trim() || null,
      meal_type: "both",
      prep_time_minutes: null,
      tags: [],
      servings: recipe.servings ?? null
    })
    .select("id")
    .single();

  if (dishError || !dish) {
    console.error("Insert dish error", dishError);
    return NextResponse.json(
      { error: "Failed to create dish" },
      { status: 500 }
    );
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

  return NextResponse.json(
    { id: dish.id, name: recipe.name.trim() },
    { status: 201 }
  );
}
