"use client";

import { useEffect, useState } from "react";
import { addDays, toISODate, weekStartOf } from "@/lib/dates";
import {
  ahSearchUrl,
  jumboSearchUrl,
  groceryListToText,
  type GroceryGroup,
} from "@/lib/groceryAggregate";
import { toast } from "@/app/components/ui/Toast";

type Week = "this" | "next";

function weekRange(week: Week) {
  const start = addDays(weekStartOf(new Date()), week === "next" ? 7 : 0);
  return { from: toISODate(start), to: toISODate(addDays(start, 6)) };
}

/** Combined, read-only ingredient list for all meals planned this or next week. */
export function WeeklyGroceryList() {
  const [week, setWeek] = useState<Week>("this");
  const [groups, setGroups] = useState<GroceryGroup[]>([]);
  const [mealCount, setMealCount] = useState(0);
  const [loadedWeek, setLoadedWeek] = useState<Week | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedWeek !== week;

  useEffect(() => {
    let cancelled = false;
    const { from, to } = weekRange(week);
    fetch(`/api/grocery-list?from=${from}&to=${to}`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { groups: GroceryGroup[]; mealCount: number };
      })
      .then((data) => {
        if (cancelled) return;
        setGroups(data.groups);
        setMealCount(data.mealCount);
        setError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setGroups([]);
        setError("Couldn't load ingredients. Try again.");
      })
      .finally(() => {
        if (!cancelled) setLoadedWeek(week);
      });
    return () => {
      cancelled = true;
    };
  }, [week]);

  const itemCount = groups.reduce((n, g) => n + g.items.length, 0);

  async function copy() {
    const { from, to } = weekRange(week);
    const text = groceryListToText(groups, `Groceries ${from} to ${to}`);
    try {
      await navigator.clipboard.writeText(text);
      toast("Grocery list copied");
    } catch {
      toast("Couldn't copy the list");
    }
  }

  const tab = (w: Week, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={week === w}
      onClick={() => setWeek(w)}
      className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold ${
        week === w
          ? "bg-orange-600 text-white"
          : "text-stone-700 dark:text-stone-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section
      aria-labelledby="weekly-grocery-heading"
      className="space-y-3 rounded-xl border border-orange-200 p-3 dark:border-stone-700"
      data-testid="weekly-grocery-list"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="weekly-grocery-heading" className="text-base font-bold text-stone-900 dark:text-stone-50">
          Ingredients for planned meals
        </h2>
        <button
          type="button"
          onClick={copy}
          disabled={loading || itemCount === 0}
          className="min-h-11 min-w-11 rounded-full border border-orange-300 px-4 text-sm font-semibold text-orange-700 disabled:opacity-50 dark:border-stone-600 dark:text-orange-300"
        >
          Copy list
        </button>
      </div>

      <div role="tablist" aria-label="Week" className="flex gap-1 rounded-full bg-orange-50 p-1 dark:bg-stone-800">
        {tab("this", "This week")}
        {tab("next", "Next week")}
      </div>

      {loading ? (
        <p className="text-sm text-stone-600 dark:text-stone-400">Loading…</p>
      ) : error ? (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      ) : itemCount === 0 ? (
        <p className="text-sm text-stone-600 dark:text-stone-400">
          {mealCount === 0
            ? `No meals planned for ${week === "this" ? "this" : "next"} week yet.`
            : "The planned recipes have no ingredients yet."}
        </p>
      ) : (
        <>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {itemCount} items from {mealCount} planned {mealCount === 1 ? "meal" : "meals"}
          </p>
          {groups.map((g) => (
            <div key={g.category}>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {g.category}
              </h3>
              <ul className="divide-y divide-orange-100 dark:divide-stone-800">
                {g.items.map((item) => (
                  <li key={item.key} className="flex flex-wrap items-center gap-2 py-1">
                    <span className="min-w-0 flex-1 text-sm text-stone-900 dark:text-stone-100">
                      {item.name}
                      {item.quantities.length > 0 && (
                        <span className="text-stone-500 dark:text-stone-400"> · {item.quantities.join(" + ")}</span>
                      )}
                    </span>
                    <a
                      href={ahSearchUrl(item.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Search ${item.name} at Albert Heijn`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300 px-3 text-xs font-semibold text-sky-700 dark:border-stone-600 dark:text-sky-300"
                    >
                      AH
                    </a>
                    <a
                      href={jumboSearchUrl(item.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Search ${item.name} at Jumbo`}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-stone-300 px-3 text-xs font-semibold text-amber-700 dark:border-stone-600 dark:text-amber-300"
                    >
                      Jumbo
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
