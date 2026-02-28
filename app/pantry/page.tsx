"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../components/IngredientAutocompleteInput";

const PANTRY_STORAGE_KEY = "jevan-pantry";

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

type Ingredient = { id: string; name: string };
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/todoist/status");
      const data = (await res.json()) as { connected: boolean };
      setConnected(data.connected);
    })();
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
    if (connected === true) {
      fetch("/api/pantry")
        .then((res) => res.json())
        .then((data: { items?: PantryItem[]; ingredient_ids?: string[] }) => {
          const items = data?.items ?? [];
          if (items.length > 0) {
            setPantryItems(items);
          } else {
            const ids = Array.isArray(data?.ingredient_ids) ? data.ingredient_ids : [];
            setPantryItems(ids.map((ingredient_id) => ({ ingredient_id, amount: null, unit: null })));
          }
        })
        .catch(() => setPantryItems([]));
    } else if (connected === false) {
      const ids = loadPantryIdsLocal();
      setPantryItems(ids.map((ingredient_id) => ({ ingredient_id, amount: null, unit: null })));
    }
  }, [mounted, connected]);

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

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900 dark:text-amber-200">
            My pantry
          </h2>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {connected
              ? "What you have (synced from Todoist or added here). Add amount and unit for deduction when you mark meals prepared."
              : "Ingredients you have. Connect Todoist in Shopping list to sync checked-off items."}
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
        <div className="flex gap-2 items-center text-xs">
          <label className="text-amber-800 dark:text-amber-200">Amount (optional)</label>
          <input
            type="number"
            step="any"
            min="0"
            placeholder="e.g. 2"
            value={addAmount}
            onChange={(e) => setAddAmount(e.target.value)}
            className="w-20 rounded border border-orange-200 px-2 py-1 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
          <label className="text-amber-800 dark:text-amber-200">Unit (optional)</label>
          <input
            type="text"
            placeholder="e.g. kg"
            value={addUnit}
            onChange={(e) => setAddUnit(e.target.value)}
            className="w-20 rounded border border-orange-200 px-2 py-1 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-3 dark:border-stone-600 dark:bg-stone-800/80">
        <h3 className="text-xs font-semibold text-amber-800 dark:text-amber-200">
          In pantry ({pantryItems.length})
        </h3>
        {pantryItems.length === 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            No ingredients yet. Add items above.
          </p>
        ) : (
          <ul className="space-y-2">
            {pantryItems.map((item) => {
              const name = getIngredientName(item.ingredient_id);
              const isEditing = editingId === item.ingredient_id;
              return (
                <li
                  key={item.ingredient_id}
                  className="flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs shadow-sm dark:bg-stone-700 dark:text-stone-200"
                >
                  <span>{name}</span>
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
                      {connected && (
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-amber-600 hover:underline dark:text-amber-400"
                        >
                          Edit qty
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromPantry(item.ingredient_id)}
                    className="text-amber-600 hover:text-red-600 dark:text-amber-400 dark:hover:text-red-400 ml-auto"
                    aria-label={`Remove ${name}`}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
