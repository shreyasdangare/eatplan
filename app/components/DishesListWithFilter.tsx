"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFavorites } from "../hooks/useFavorites";

type Dish = {
  id: string;
  name: string;
  meal_type?: string | null;
  tags?: string[] | null;
};

export function DishesListWithFilter({ dishes }: { dishes: Dish[] }) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => (d.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    let list = dishes;
    if (showFavoritesOnly) {
      list = list.filter((d) => favoriteIds.includes(d.id));
    } else if (selectedTags.size > 0) {
      list = list.filter((d) =>
        (d.tags ?? []).some((t) => selectedTags.has(t))
      );
    }
    return list;
  }, [dishes, selectedTags, showFavoritesOnly, favoriteIds]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const clearFilters = () => setSelectedTags(new Set());

  if (!dishes.length) {
    return (
      <p className="text-sm text-amber-700">
        No dishes yet. Tap &quot;Add dish&quot; to create your first one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`rounded-full px-2.5 py-1 text-[11px] ${
            showFavoritesOnly
              ? "bg-orange-500 text-white"
              : "bg-orange-100 text-orange-900 hover:bg-orange-200 dark:bg-stone-700 dark:text-orange-200 dark:hover:bg-stone-600"
          }`}
        >
          Favorites
        </button>
        {allTags.length > 0 && (
          <>
            <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
              Tag:
            </span>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-2.5 py-1 text-[11px] ${
                  selectedTags.has(tag)
                    ? "bg-orange-500 text-white"
                    : "bg-orange-100 text-orange-900 hover:bg-orange-200 dark:bg-stone-700 dark:text-orange-200 dark:hover:bg-stone-600"
                }`}
              >
                {tag}
              </button>
            ))}
            {selectedTags.size > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-full px-2.5 py-1 text-[11px] text-amber-700 underline hover:text-amber-900 dark:text-amber-300"
              >
                Clear
              </button>
            )}
          </>
        )}
      </div>
      <ul className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {filteredDishes.length === 0 ? (
          <li className="col-span-full">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              No dishes match the selected tags.
            </p>
          </li>
        ) : (
          filteredDishes.map((dish) => (
            <li
              key={dish.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/80 px-4 py-3 text-sm shadow-sm dark:border-stone-600 dark:bg-stone-800/80"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-stone-900 dark:text-stone-100">
                  {dish.name}
                </p>
                {dish.meal_type && (
                  <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    {dish.meal_type}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(dish.id);
                  }}
                  className="text-lg leading-none"
                  aria-label={isFavorite(dish.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  {isFavorite(dish.id) ? "❤️" : "🤍"}
                </button>
                <Link
                  href={`/dishes/${dish.id}`}
                  className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500"
                >
                  View
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
