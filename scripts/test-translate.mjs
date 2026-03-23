const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

const model = "gemini-2.5-flash";
const targetLanguage = "Marathi";
const ingredient = "potato";

const prompt = `Translate the culinary ingredient "${ingredient}" into the language represented by the locale code or name "${targetLanguage}".
Provide ONLY the translated ingredient name as your response. Do not include any markdown, extra text, quotes, or punctuation. Make it lower-cased unless it's a proper noun.`;

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
    }
  );

  if (!response.ok) {
    console.log("FAILED", await response.text());
  } else {
    const json = await response.json();
    const t = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim().replace(/['"]/g, "");
    console.log("Translation returned:", t);
  }
} catch(e) {
  console.log("Network Error", e.message);
}
