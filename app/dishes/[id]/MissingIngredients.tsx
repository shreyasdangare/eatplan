"use client";

import { useCallback, useEffect, useState } from "react";
import { ShoppingCart, Check, Package } from "lucide-react";

type IngredientRow = {
  ingredient_id: string;
  ingredients?: { name: string } | null;
  quantity?: string | null;
  amount?: number | null;
  unit?: string | null;
};

type Props = {
  dishIngredients: IngredientRow[];
};

export function MissingIngredients({ dishIngredients }: Props) {
  const [pantryIds, setPantryIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch("/api/pantry")
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data: { items?: { ingredient_id: string }[] }) => {
        const ids = new Set(
          (data.items ?? []).map((i) => i.ingredient_id)
        );
        setPantryIds(ids);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const missing = dishIngredients.filter(
    (di) => di.ingredient_id && !pantryIds.has(di.ingredient_id)
  );

  const inPantry = dishIngredients.filter(
    (di) => di.ingredient_id && pantryIds.has(di.ingredient_id)
  );

  const handleAddMissing = useCallback(async () => {
    if (missing.length === 0) return;
    setAdding(true);
    try {
      const items = missing.map((di) => ({
        ingredient_id: di.ingredient_id,
        quantity:
          di.amount != null && di.unit
            ? `${di.amount} ${di.unit}`
            : di.quantity ?? null,
        source: "manual" as const,
      }));
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) setAdded(true);
    } finally {
      setAdding(false);
    }
  }, [missing]);

  if (loading) return null;
  if (dishIngredients.length === 0) return null;

  return (
    <div className="rounded-2xl glass-panel p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-stone-800 dark:text-orange-500">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-50">
            Pantry check
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {inPantry.length} of {dishIngredients.length} ingredients in pantry
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-stone-200 dark:bg-stone-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-lime-500 to-lime-400 transition-all duration-500"
          style={{
            width: `${dishIngredients.length > 0 ? (inPantry.length / dishIngredients.length) * 100 : 0}%`,
          }}
        />
      </div>

      {missing.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((di) => (
              <span
                key={di.ingredient_id}
                className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-800 dark:border-orange-800/40 dark:bg-orange-950/30 dark:text-orange-300"
              >
                {di.ingredients?.name ?? "Unknown"}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddMissing}
            disabled={adding || added}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all ${
              added
                ? "bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300"
                : "bg-orange-500 text-white hover:bg-orange-400 active:scale-[0.98] dark:bg-orange-600 dark:hover:bg-orange-500"
            } disabled:opacity-60`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Added to shopping list
              </>
            ) : adding ? (
              "Adding…"
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                Add {missing.length} missing to shopping list
              </>
            )}
          </button>
        </>
      )}

      {missing.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-lime-50 px-4 py-3 text-sm font-medium text-lime-800 dark:bg-lime-950/30 dark:text-lime-300">
          <Check className="h-4 w-4" />
          You have everything you need!
        </div>
      )}
    </div>
  );
}
