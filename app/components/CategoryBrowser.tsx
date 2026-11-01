"use client";

import { useMemo, useState } from "react";
import { SHOPPING_CATEGORIES, inferCategoryFromName } from "@/lib/categoryEmoji";

type IngredientOption = { id: string; name: string; category?: string | null };

type CategoryBrowserProps = {
  ingredients: IngredientOption[];
  onAddItem: (item: { ingredient_id: string; custom_name?: string; name?: string }) => void;
};

function groupIngredientsByCategory(
  ingredients: IngredientOption[]
): Map<string, IngredientOption[]> {
  const map = new Map<string, IngredientOption[]>();
  for (const ing of ingredients) {
    const category =
      ing.category?.trim() ||
      inferCategoryFromName(ing.name) ||
      "Other";
    if (!map.has(category)) map.set(category, []);
    map.get(category)!.push(ing);
  }
  for (const cat of SHOPPING_CATEGORIES) {
    if (!map.has(cat)) map.set(cat, []);
  }
  // Sort items within each category by name
  for (const arr of map.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

export function CategoryBrowser({ ingredients, onAddItem }: CategoryBrowserProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const byCategory = useMemo(
    () => groupIngredientsByCategory(ingredients),
    [ingredients]
  );

  return (
    <div className="rounded-2xl border-2 border-dashed border-ink px-3 py-0.5 dark:border-stone-600">
      <button
        type="button"
        onClick={() => setExpanded((p) => (p ? null : SHOPPING_CATEGORIES[0]))}
        aria-expanded={expanded !== null}
        className="flex min-h-11 w-full items-center justify-between text-left text-xs font-extrabold uppercase tracking-wider text-ink dark:text-stone-200"
      >
        <span>Browse categories</span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded !== null && (
        <div className="border-t-2 border-stone-200 px-1 pb-2 pt-1.5 dark:border-stone-600">
          {SHOPPING_CATEGORIES.map((cat) => {
            const items = byCategory.get(cat) ?? [];
            if (items.length === 0) return null;
            const isOpen = expanded === cat;
            return (
              <div key={cat} className="mb-2 last:mb-0">
                <button
                  type="button"
                  onClick={() => setExpanded((p) => (p === cat ? null : cat))}
                  aria-expanded={isOpen}
                  className="flex min-h-11 w-full items-center gap-1.5 text-left text-sm font-bold text-ink dark:text-stone-100"
                >
                  <span>{cat}</span>
                  <span className="text-stone-600 dark:text-stone-400">
                    ({items.length})
                  </span>
                  <svg
                    className={`ml-auto h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="mt-0.5 flex flex-wrap gap-2 pl-1">
                    {items.slice(0, 24).map((ing) => (
                      <button
                        key={ing.id}
                        type="button"
                        onClick={() => onAddItem({ ingredient_id: ing.id, name: ing.name })}
                        className="press min-h-11 rounded-full border-2 border-ink bg-white px-3.5 text-sm font-semibold text-ink shadow-xs hover:bg-cream dark:border-stone-500 dark:bg-stone-900 dark:text-stone-100"
                      >
                        {ing.name}
                      </button>
                    ))}
                    {items.length > 24 && (
                      <span className="flex items-center text-sm text-stone-600 dark:text-stone-400">
                        +{items.length - 24} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
