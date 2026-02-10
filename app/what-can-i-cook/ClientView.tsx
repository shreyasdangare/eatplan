"use client";

import { FormEvent, useEffect, useState } from "react";

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
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            Tap ingredients you have today:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((ing) => {
              const isActive = selected.includes(ing.id);
              return (
                <button
                  type="button"
                  key={ing.id}
                  onClick={() => toggle(ing.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    isActive
                      ? "bg-emerald-500 text-emerald-950"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  {ing.name}
                </button>
              );
            })}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || selected.length === 0}
          className="w-full rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-50"
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
                  <h3 className="text-xs font-semibold text-slate-200">
                    {title}
                  </h3>
                  <ul className="space-y-1.5">
                    {bucket.map((dish) => (
                      <li
                        key={dish.id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs"
                      >
                        <span>{dish.name}</span>
                        {dish.stats && (
                          <span className="text-[11px] text-slate-400">
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

