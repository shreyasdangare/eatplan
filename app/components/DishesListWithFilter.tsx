"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFavorites } from "../hooks/useFavorites";

type Dish = {
  id: string;
  name: string;
  meal_type?: string | null;
  tags?: string[] | null;
  image_url?: string | null;
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
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-8 text-center">
        <p className="text-sm text-stone-600">
          No recipes yet.
        </p>
        <p className="mt-1 text-sm text-stone-500">
          Add one from a URL or screenshot to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFavoritesOnly((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              showFavoritesOnly
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            Favorites
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedTags.has(tag)
                  ? "bg-stone-900 text-white"
                  : "bg-stone-100 text-stone-700 hover:bg-stone-200"
              }`}
            >
              {tag}
            </button>
          ))}
          {(selectedTags.size > 0 || showFavoritesOnly) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTags(new Set());
                setShowFavoritesOnly(false);
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-stone-500 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDishes.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-stone-200 bg-stone-50/80 p-8 text-center">
            <p className="text-sm text-stone-600">
              No recipes match the current filters.
            </p>
          </li>
        ) : (
          filteredDishes.map((dish) => (
            <li key={dish.id}>
              <Link
                href={`/dishes/${dish.id}`}
                className="group block overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition-all duration-300 hover:border-stone-300 hover:shadow-md hover:shadow-stone-200/50"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300">
                      <span className="text-4xl" aria-hidden>🍽</span>
                    </div>
                  )}
                  {/* Gradient overlay so text is readable */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-stone-900/85 via-stone-900/20 to-transparent opacity-90 transition-opacity group-hover:opacity-95"
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleFavorite(dish.id);
                    }}
                    className="absolute right-2 top-2 z-10 rounded-full bg-white/90 p-1.5 text-lg shadow-sm backdrop-blur-sm hover:bg-white"
                    aria-label={isFavorite(dish.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    {isFavorite(dish.id) ? "❤️" : "🤍"}
                  </button>
                  {/* Recipe name and meta over the image */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-4 pt-8">
                    <p className="font-semibold text-white drop-shadow-md [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                      {dish.name}
                    </p>
                    {dish.meal_type && (
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-stone-200">
                        {dish.meal_type}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
