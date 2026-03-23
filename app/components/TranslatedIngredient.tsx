"use client";

import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";

interface TranslatedIngredientProps {
  name: string;
}

export function TranslatedIngredient({ name }: TranslatedIngredientProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleTranslate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (translation || isLoading) return;

    setIsLoading(true);
    setError(false);

    try {
      // Use the browser's language, fallback to English
      const targetLanguage = navigator.language || "en-US";
      
      const res = await fetch("/api/translate-ingredient", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ingredient: name, targetLanguage }),
      });

      if (!res.ok) throw new Error("Failed to translate");

      const data = await res.json();
      setTranslation(data.translation);
    } catch (err) {
      console.error("Translation error:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center flex-wrap gap-1.5 align-middle">
      <span>{name}</span>
      {translation ? (
        <span className="text-amber-600 dark:text-amber-400 font-medium italic text-sm bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-md border border-amber-200/50 dark:border-amber-700/50 shadow-sm whitespace-nowrap">
          {translation}
        </span>
      ) : (
        <button
          onClick={handleTranslate}
          disabled={isLoading}
          className="inline-flex items-center justify-center p-1 rounded-md text-stone-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:hover:text-amber-400 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
          title="Translate ingredient to local language"
          aria-label={`Translate ${name}`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Languages className="h-4 w-4" />
          )}
        </button>
      )}
      {error && (
        <span className="text-red-500 text-xs font-bold" title="Translation failed">
          Failed
        </span>
      )}
    </span>
  );
}
