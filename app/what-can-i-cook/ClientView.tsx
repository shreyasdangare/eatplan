 "use client";

import { FormEvent, useEffect, useState } from "react";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../components/IngredientAutocompleteInput";

type Ingredient = {
  id: string;
  name: string;
};

type SuggestionBucket = {
  id: string;
  name: string;
  stats?: {
    haveCount: number;
    missingCount: number;
    matchPct: number;
  };
};

export function WhatCanICookClient() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    fullyCookable: SuggestionBucket[];
    almostCookable: SuggestionBucket[];
    others: SuggestionBucket[];
  } | null>(null);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = (await res.json()) as Ingredient[];
        setIngredients(data);
      }
    })();
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const ingredientOptions: IngredientOption[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name
  }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredient_ids: selected })
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setResults(data);
    } else {
      alert("Failed to fetch suggestions");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-3">
          <p className="text-xs font-medium text-amber-800">
            Start typing to add ingredients you have today:
          </p>
          <IngredientAutocompleteInput
            label="Ingredients you have"
            ingredients={ingredientOptions}
            value={searchInput}
            onChange={setSearchInput}
            onSelectExisting={(ingredient) => {
              toggle(ingredient.id);
            }}
            onCreateNew={() => {
              // For \"what can I cook\" view, we don't allow creating new ingredients directly.
              // User should add new ingredients via the dishes page first.
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading || selected.length === 0}
          className="w-full rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-lime-950 shadow-sm disabled:opacity-50 hover:bg-lime-400"
        >
          {loading ? "Finding dishes…" : "Find dishes"}
        </button>
      </form>

      {results && (
        <div className="space-y-4">
          {(["fullyCookable", "almostCookable", "others"] as const).map(
            (bucketKey) => {
              const bucket = results[bucketKey];
              if (!bucket.length) return null;
              const title =
                bucketKey === "fullyCookable"
                  ? "Fully cookable"
                  : bucketKey === "almostCookable"
                  ? "Almost cookable"
                  : "Others";
              return (
                <div key={bucketKey} className="space-y-2">
                  <h3 className="text-xs font-semibold text-emerald-800">
                    {title}
                  </h3>
                  <ul className="space-y-1.5">
                    {bucket.map((dish) => (
                        <li
                          key={dish.id}
                          className="flex items-center justify-between rounded-lg border border-lime-200 bg-lime-50/80 px-3 py-2 text-xs"
                        >
                        <span>{dish.name}</span>
                        {dish.stats && (
                          <span className="text-[11px] text-lime-700">
                            {dish.stats.matchPct}% match
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

