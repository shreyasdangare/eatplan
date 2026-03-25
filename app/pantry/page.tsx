"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../components/IngredientAutocompleteInput";
import { SHOPPING_CATEGORIES, getCategoryEmoji, inferCategoryFromName } from "@/lib/categoryEmoji";

const PANTRY_STORAGE_KEY = "eatplan-pantry";

function loadPantryIdsLocal(): string[] {
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

function savePantryIdsLocal(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PANTRY_STORAGE_KEY, JSON.stringify(ids));
}

type Ingredient = { id: string; name: string; category?: string | null };
type PantryItem = { ingredient_id: string; amount: number | null; unit: string | null };

export default function PantryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [addAmount, setAddAmount] = useState<string>("");
  const [addUnit, setAddUnit] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = (await res.json()) as Ingredient[];
        setIngredients(data);
      }
    })();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetch("/api/pantry")
      .then((res) => {
        if (!res.ok) throw new Error("not authenticated");
        return res.json();
      })
      .then((data: { items?: PantryItem[]; ingredient_ids?: string[] }) => {
        setConnected(true);
        const items = data?.items ?? [];
        if (items.length > 0) {
          setPantryItems(items);
        } else {
          const ids = Array.isArray(data?.ingredient_ids) ? data.ingredient_ids : [];
          setPantryItems(ids.map((ingredient_id) => ({ ingredient_id, amount: null, unit: null })));
        }
      })
      .catch(() => {
        setConnected(false);
        const ids = loadPantryIdsLocal();
        setPantryItems(ids.map((ingredient_id) => ({ ingredient_id, amount: null, unit: null })));
      });
  }, [mounted]);

  const pantryIds = pantryItems.map((p) => p.ingredient_id);

  const savePantry = useCallback(
    (ids: string[]) => {
      setPantryItems((prev) => {
        const next = prev.filter((p) => ids.includes(p.ingredient_id));
        const added = ids.filter((id) => !prev.some((p) => p.ingredient_id === id));
        return [...next, ...added.map((ingredient_id) => ({ ingredient_id, amount: null as number | null, unit: null as string | null }))];
      });
      if (!connected) savePantryIdsLocal(ids);
    },
    [connected]
  );

  const addToPantry = useCallback(
    async (id: string, amount?: number | null, unit?: string | null) => {
      if (pantryIds.includes(id)) return;
      if (connected) {
        const res = await fetch("/api/pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredient_id: id,
            amount: amount ?? null,
            unit: unit ?? null,
          }),
        });
        if (res.ok) {
          setPantryItems((prev) => [
            ...prev,
            { ingredient_id: id, amount: amount ?? null, unit: unit ?? null },
          ]);
        }
        return;
      }
      savePantry([...pantryIds, id]);
    },
    [connected, pantryIds, savePantry]
  );

  const updatePantryQuantity = useCallback(
    async (ingredientId: string, amount: number | null, unit: string | null) => {
      if (connected) {
        const res = await fetch("/api/pantry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredient_id: ingredientId,
            amount,
            unit,
          }),
        });
        if (res.ok) {
          setPantryItems((prev) =>
            prev.map((p) =>
              p.ingredient_id === ingredientId ? { ...p, amount, unit } : p
            )
          );
        }
      }
      setEditingId(null);
    },
    [connected]
  );

  const removeFromPantry = useCallback(
    async (id: string) => {
      if (connected) {
        await fetch(`/api/pantry?ingredient_id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        setPantryItems((prev) => prev.filter((p) => p.ingredient_id !== id));
        return;
      }
      savePantry(pantryIds.filter((x) => x !== id));
    },
    [connected, pantryIds, savePantry]
  );

  const startEdit = (item: PantryItem) => {
    setEditingId(item.ingredient_id);
    setEditAmount(item.amount != null ? String(item.amount) : "");
    setEditUnit(item.unit ?? "");
  };

  const ingredientOptions: IngredientOption[] = ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name
  }));

  const getIngredientName = (id: string) =>
    ingredients.find((i) => i.id === id)?.name ?? id;

  const getIngredientCategory = (id: string) => {
    const ing = ingredients.find((i) => i.id === id);
    return ing?.category?.trim() || inferCategoryFromName(ing?.name ?? "") || "Other";
  };

  const addToShoppingList = useCallback(
    async (ingredientId: string) => {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_id: ingredientId,
          source: "manual",
        }),
      });
      if (res.ok) {
        // Brief visual feedback - could be enhanced later
      }
    },
    []
  );

  // Filter and group pantry items
  const filteredItems = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return pantryItems;
    return pantryItems.filter((item) => {
      const name = getIngredientName(item.ingredient_id).toLowerCase();
      return name.includes(q);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantryItems, filterQuery, ingredients]);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, PantryItem[]>();
    for (const item of filteredItems) {
      const cat = getIngredientCategory(item.ingredient_id);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(item);
    }
    const ordered = [...SHOPPING_CATEGORIES, "Other"].filter((c) => groups.has(c));
    for (const c of groups.keys()) {
      if (!ordered.includes(c)) ordered.push(c);
    }
    return ordered.map((cat) => ({ category: cat, items: groups.get(cat) ?? [] }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredItems, ingredients]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900 dark:text-amber-200">
            My pantry
          </h2>
          <p className="text-xs text-amber-700/80 dark:text-amber-300/70">
            {connected
              ? "What you have on hand."
              : "Log in to sync across devices."}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500"
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
            const amt = addAmount.trim() ? parseFloat(addAmount) : null;
            const u = addUnit.trim() || null;
            addToPantry(ing.id, amt ?? null, u);
            setSearchInput("");
            setAddAmount("");
            setAddUnit("");
          }}
          onCreateNew={() => {}}
        />
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center text-xs w-full">
          <div className="flex items-center gap-2 flex-1 relative group">
            <label className="text-amber-800 dark:text-amber-200 font-medium sm:font-normal min-w-[3.5rem] sm:min-w-0">Amount</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 2"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              className="w-full sm:w-20 rounded-xl border border-orange-200 bg-white px-3 py-2 sm:py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 flex-1 relative group">
            <label className="text-amber-800 dark:text-amber-200 font-medium sm:font-normal min-w-[3.5rem] sm:min-w-0">Unit</label>
            <input
              type="text"
              placeholder="e.g. kg"
              value={addUnit}
              onChange={(e) => setAddUnit(e.target.value)}
              className="w-full sm:w-20 rounded-xl border border-orange-200 bg-white px-3 py-2 sm:py-1.5 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/50 outline-none transition-all dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-orange-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-3 dark:border-stone-600 dark:bg-stone-800/80">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200">
            In pantry ({pantryItems.length})
          </h3>
          {pantryItems.length > 3 && (
            <input
              type="text"
              placeholder="Filter pantry…"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-36 rounded-lg border border-orange-200 bg-white px-2 py-1 text-xs placeholder:text-amber-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
            />
          )}
        </div>
        {filteredItems.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {pantryItems.length === 0 ? "No ingredients yet. Add items above." : "No items match your filter."}
          </p>
        ) : (
          <div className="space-y-3">
            {groupedItems.map(({ category, items }) => (
              <div key={category}>
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="text-sm" aria-hidden>{getCategoryEmoji(category)}</span>
                  <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
                    {category} ({items.length})
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((item) => {
                    const name = getIngredientName(item.ingredient_id);
                    const isEditing = editingId === item.ingredient_id;
                    return (
                      <li
                        key={item.ingredient_id}
                        className="flex flex-wrap items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs shadow-sm dark:bg-stone-700 dark:text-stone-200"
                      >
                        <span className="font-medium">{name}</span>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              placeholder="Amount"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              className="w-16 rounded border border-orange-200 px-1.5 py-0.5 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            />
                            <input
                              type="text"
                              placeholder="Unit"
                              value={editUnit}
                              onChange={(e) => setEditUnit(e.target.value)}
                              className="w-14 rounded border border-orange-200 px-1.5 py-0.5 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                updatePantryQuantity(
                                  item.ingredient_id,
                                  editAmount.trim() ? parseFloat(editAmount) : null,
                                  editUnit.trim() || null
                                )
                              }
                              className="text-lime-600 hover:underline"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-amber-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {(item.amount != null || (item.unit && item.unit.trim())) && (
                              <span className="text-amber-700 dark:text-amber-300">
                                {item.amount != null ? item.amount : ""}
                                {item.unit?.trim() ? ` ${item.unit}` : ""}
                              </span>
                            )}
                            <div className="ml-auto flex items-center gap-1.5">
                              {connected && (
                                <button
                                  type="button"
                                  onClick={() => startEdit(item)}
                                  className="text-amber-600 hover:underline dark:text-amber-400"
                                >
                                  Edit qty
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => addToShoppingList(item.ingredient_id)}
                                className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-800 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:hover:bg-orange-800/40"
                                title="Add to shopping list"
                              >
                                + List
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFromPantry(item.ingredient_id)}
                                className="text-amber-600 hover:text-red-600 dark:text-amber-400 dark:hover:text-red-400"
                                aria-label={`Remove ${name}`}
                              >
                                ×
                              </button>
                            </div>
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
