"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Dish = { id: string; name: string };
type ShoppingLine = {
  ingredient_id: string;
  ingredient_name: string;
  quantity_display: string;
};

export default function ShoppingListPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<ShoppingLine[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/dishes");
      if (res.ok) {
        const data = (await res.json()) as Dish[];
        setDishes(data);
      }
    })();
  }, []);

  const toggleDish = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateList = async () => {
    if (selectedIds.size === 0) return;
    setLoading(true);
    const res = await fetch("/api/shopping-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish_ids: Array.from(selectedIds) })
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setLines(data.lines ?? []);
    } else {
      setLines([]);
    }
  };

  const copyList = () => {
    if (!lines?.length) return;
    const text = lines
      .map((l) => (l.quantity_display ? `${l.ingredient_name}: ${l.quantity_display}` : l.ingredient_name))
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            Shopping list
          </h2>
          <p className="text-xs text-amber-700">
            Select dishes to aggregate ingredients.
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
        <p className="text-xs font-medium text-amber-800">
          Select dishes to include:
        </p>
        <ul className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-orange-200 bg-orange-50/80 p-2">
          {dishes.map((d) => (
            <li key={d.id}>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.has(d.id)}
                  onChange={() => toggleDish(d.id)}
                  className="rounded border-orange-300"
                />
                {d.name}
              </label>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={loading || selectedIds.size === 0}
          onClick={generateList}
          className="w-full rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-lime-950 shadow-sm disabled:opacity-50 hover:bg-lime-400"
        >
          {loading ? "Generating…" : "Generate shopping list"}
        </button>
      </div>

      {lines !== null && (
        <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-amber-800">
              Ingredients
            </h3>
            {lines.length > 0 && (
              <button
                type="button"
                onClick={copyList}
                className="rounded-full bg-amber-200 px-2 py-1 text-[11px] font-medium text-amber-900 hover:bg-amber-300"
              >
                Copy list
              </button>
            )}
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-amber-700">
              No ingredients to show. Add ingredients to the selected dishes.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {lines.map((l) => (
                <li
                  key={l.ingredient_id}
                  className="flex justify-between gap-2"
                >
                  <span>{l.ingredient_name}</span>
                  {l.quantity_display && (
                    <span className="text-amber-700">
                      {l.quantity_display}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
