export function getTranslatedTagline(language?: string): string {
  if (!language) return "काय खायचं?";
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
  
  return "काय खायचं?";
}
