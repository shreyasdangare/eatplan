"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../components/IngredientAutocompleteInput";

const PANTRY_STORAGE_KEY = "jevan-pantry";

function loadPantryIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PANTRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function savePantryIds(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(ids));
}

type Ingredient = { id: string; name: string };

export default function PantryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryIds, setPantryIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setPantryIds(loadPantryIds());
  }, [mounted]);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = (await res.json()) as Ingredient[];
        setIngredients(data);
      }
    })();
  }, []);

  const savePantry = useCallback((ids: string[]) => {
    setPantryIds(ids);
    savePantryIds(ids);
  }, []);

  const addToPantry = (id: string) => {
    if (pantryIds.includes(id)) return;
    savePantry([...pantryIds, id]);
  };

  const removeFromPantry = (id: string) => {
    savePantry(pantryIds.filter((x) => x !== id));
  };

  const ingredientOptions: IngredientOption[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name
  }));

  const pantryIngredients = pantryIds
    .map((id) => ingredients.find((i) => i.id === id))
    .filter((x): x is Ingredient => !!x);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            My pantry
          </h2>
          <p className="text-xs text-amber-700">
            Ingredients you always have. Used in &quot;What can I cook?&quot;
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
        >
          Home
        </Link>
      </div>

      <div className="space-y-2">
        <IngredientAutocompleteInput
          label="Add ingredient to pantry"
          ingredients={ingredientOptions}
          value={searchInput}
          onChange={setSearchInput}
          onSelectExisting={(ing) => {
            addToPantry(ing.id);
            setSearchInput("");
          }}
          onCreateNew={() => {}}
        />
      </div>

      <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-3">
        <h3 className="text-xs font-semibold text-amber-800">
          In pantry ({pantryIngredients.length})
        </h3>
        {pantryIngredients.length === 0 ? (
          <p className="text-sm text-amber-700">
            No ingredients yet. Add items above.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {pantryIngredients.map((ing) => (
              <li
                key={ing.id}
                className="flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                {ing.name}
                <button
                  type="button"
                  onClick={() => removeFromPantry(ing.id)}
                  className="text-amber-600 hover:text-red-600"
                  aria-label={`Remove ${ing.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
