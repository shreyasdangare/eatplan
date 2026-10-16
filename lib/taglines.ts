export function getTranslatedTagline(language?: string): string {
  if (!language) return "What to eat?";
  const lang = language.toLowerCase().trim();
  
  if (lang.includes("english") || lang === "en") return "What to eat?";
  if (lang.includes("hindi") || lang === "hi") return "क्या खाएं?";
  if (lang.includes("spanish") || lang === "es") return "¿Qué comer?";
  if (lang.includes("french") || lang === "fr") return "Que manger ?";
  if (lang.includes("german") || lang === "de") return "Was soll man essen?";
  if (lang.includes("gujarati") || lang === "gu") return "શું ખાવું?";
  if (lang.includes("telugu") || lang === "te") return "ఏం తినాలి?";
  if (lang.includes("tamil") || lang === "ta") return "என்ன சாப்பிடலாம்?";
  if (lang.includes("kannada") || lang === "kn") return "ಏನು ತಿನ್ನಬೇಕು?";
  if (lang.includes("bengali") || lang === "bn") return "কী খাব?";
  if (lang.includes("marathi") || lang === "mr") return "काय खायचं?";
  if (lang.includes("malayalam") || lang === "ml") return "എന്ത് കഴിക്കണം?";
  if (lang.includes("urdu") || lang === "ur") return "کیا کھائیں؟";
  
  return "What to eat?";
}

export function getTranslatedWelcome(language?: string, isFirstVisit: boolean = false): string {
  const prefix = isFirstVisit ? "Welcome," : "Welcome back,";
  if (!language) return prefix;
  
  const lang = language.toLowerCase().trim();
  if (lang.includes("english") || lang === "en") return prefix;
  if (lang.includes("hindi") || lang === "hi") return isFirstVisit ? "स्वागत है," : "वापसी पर स्वागत है,";
  if (lang.includes("marathi") || lang === "mr") return isFirstVisit ? "स्वागत आहे," : "परत आल्याबद्दल स्वागत,";
  if (lang.includes("spanish") || lang === "es") return isFirstVisit ? "Bienvenido," : "Bienvenido de nuevo,";
  if (lang.includes("french") || lang === "fr") return isFirstVisit ? "Bienvenue," : "Bon retour,";
  
  return prefix;
}

/** BCP 47 locale for dates/numbers in the user's language (falls back to English). */
export function languageToLocale(language?: string): string {
  const lang = (language ?? "").toLowerCase().trim();
  const map: [string, string][] = [
    ["marathi", "mr-IN"], ["hindi", "hi-IN"], ["gujarati", "gu-IN"], ["telugu", "te-IN"], ["tamil", "ta-IN"],
    ["kannada", "kn-IN"], ["bengali", "bn-IN"], ["spanish", "es-ES"], ["french", "fr-FR"], ["german", "de-DE"],
  ];
  for (const [name, locale] of map) if (lang.includes(name) || lang === locale.slice(0, 2)) return locale;
  return "en-GB";
}

/** First visible character of a name for an avatar (handles Devanagari and emoji). */
export function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (s: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) {
    for (const { segment } of new Seg(undefined, { granularity: "grapheme" }).segment(trimmed)) return segment.toUpperCase();
  }
  return Array.from(trimmed)[0].toUpperCase();
}
