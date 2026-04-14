import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabaseServerClient";
import { getHouseholdId } from "@/lib/getHouseholdId";
import { logLlmUsage, extractGeminiTokens } from "@/lib/logLlmUsage";

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if ("error" in auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { ingredient, targetLanguage } = await req.json();

    if (!ingredient) {
      return NextResponse.json(
        { error: "Missing ingredient" },
        { status: 400 }
      );
    }
    
    // Prefer the user's saved native language, but fallback to the client's request
    const userNativeLanguage = auth.user.native_language;
    const finalLanguage = userNativeLanguage || targetLanguage;

    if (!finalLanguage) {
      return NextResponse.json(
        { error: "Missing targetLanguage or native_language" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Translation service not configured" },
        { status: 501 }
      );
    }

    const prompt = `Translate the culinary ingredient "${ingredient}" into the language represented by the locale code or name "${finalLanguage}".
Provide ONLY the translated ingredient name as your response. Do not include any markdown, extra text, quotes, or punctuation. Make it lower-cased unless it's a proper noun.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 150,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    let translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!translation) {
      throw new Error("No translation returned");
    }

    // Clean up any potential markdown or quotes sometimes returned by LLM
    translation = translation.replace(/['"]/g, "");

    // Log LLM usage (fire-and-forget)
    const householdId = await getHouseholdId(auth.user.id);
    const tokens = extractGeminiTokens(data);
    logLlmUsage({
      userId: auth.user.id,
      householdId,
      endpoint: "translate-ingredient",
      model: "gemini-2.5-flash",
      input_tokens: tokens.input_tokens,
      output_tokens: tokens.output_tokens,
    });

    return NextResponse.json({ translation });
  } catch (error: any) {
    console.error("Error translating ingredient:", error);
    return NextResponse.json(
      { error: "Failed to translate ingredient" },
      { status: 500 }
    );
  }
}
