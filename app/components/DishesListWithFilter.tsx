"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFavorites } from "../hooks/useFavorites";
import { Heart, UtensilsCrossed, X } from "lucide-react";

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
    }
    if (selectedTags.size > 0) {
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

  if (!dishes.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[2rem] glass-panel p-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-stone-800 dark:text-orange-500">
          <UtensilsCrossed size={32} />
        </div>
        <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50">No recipes yet</h3>
        <p className="mt-2 max-w-sm text-sm text-stone-500 dark:text-stone-400">
          Your collection is empty. Add a recipe from a URL or image to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Strip */}
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <button
          type="button"
          onClick={() => setShowFavoritesOnly((v) => !v)}
          className={`group flex min-h-[44px] items-center gap-2 rounded-full border px-4 py-2 font-semibold transition-all ${
            showFavoritesOnly
              ? "border-rose-500 bg-rose-500 text-white shadow-md dark:border-rose-600 dark:bg-rose-600"
              : "border-stone-200/50 bg-white/50 text-stone-600 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
          }`}
        >
          <Heart
            size={18}
            className={showFavoritesOnly ? "fill-white" : "transition-colors group-hover:text-rose-500"}
          />
          Favorites
        </button>
        
        {/* Separator */}
        <div className="h-8 w-px bg-stone-200 dark:bg-stone-700 mx-1" />

        <div className="flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`min-h-[44px] rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95 ${
                selectedTags.has(tag)
                  ? "border-stone-800 bg-stone-800 text-white shadow-md dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900"
                  : "border-stone-200/50 bg-white/50 text-stone-600 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:border-stone-600 dark:hover:bg-stone-700 dark:hover:text-stone-100"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {(selectedTags.size > 0 || showFavoritesOnly) && (
          <button
            type="button"
            onClick={() => {
              setSelectedTags(new Set());
              setShowFavoritesOnly(false);
            }}
            className="flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-stone-500 hover:bg-stone-200/50 hover:text-stone-800 active:scale-95 transition-all dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:text-stone-200"
          >
            <X size={16} />
            Clear
          </button>
        )}
      </div>

      {/* Grid */}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredDishes.length === 0 ? (
          <li className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/50 text-center dark:border-stone-700 dark:bg-stone-800/30">
            <p className="text-base font-medium text-stone-600 dark:text-stone-400">
              No recipes match your current filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedTags(new Set());
                setShowFavoritesOnly(false);
              }}
              className="mt-3 font-semibold text-orange-600 hover:underline dark:text-orange-400"
            >
              Clear filters
            </button>
          </li>
        ) : (
          filteredDishes.map((dish) => (
            <li key={dish.id} className="group/card relative">
              <Link
                href={`/dishes/${dish.id}`}
                className="block overflow-hidden rounded-[2rem] glass-panel transition-all duration-500 hover:-translate-y-1 hover:shadow-xl dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 dark:bg-stone-800">
                  {dish.image_url ? (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-300 transition-transform duration-500 group-hover/card:scale-110 dark:text-stone-600">
                      <UtensilsCrossed size={48} strokeWidth={1.5} />
                    </div>
                  )}
                  {/* Subtle vignette / gradient overlay */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-stone-900/90 via-stone-900/20 to-transparent opacity-80 transition-opacity duration-300 group-hover/card:opacity-95"
                    aria-hidden
                  />
                  
                  {/* Content overlay */}
                  <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6 translate-y-2 transition-transform duration-500 ease-out group-hover/card:translate-y-0">
                    <h3 className="text-lg font-bold leading-tight text-white drop-shadow-md sm:text-xl line-clamp-2">
                      {dish.name}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-2 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100">
                      {dish.meal_type && (
                        <span className="rounded-md bg-white/20 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                          {dish.meal_type}
                        </span>
                      )}
                      {dish.tags?.[0] && (
                        <span className="truncate max-w-[120px] rounded-md bg-black/30 px-2 py-1 text-xs font-medium text-stone-200 backdrop-blur-md border border-white/10">
                          {dish.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              
              {/* Floating Favorite Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(dish.id);
                }}
                className={`absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 ${
                  isFavorite(dish.id)
                    ? "bg-white text-rose-500 hover:bg-rose-50 dark:bg-stone-800 dark:hover:bg-stone-700"
                    : "bg-black/20 text-white border border-white/30 hover:bg-white/40 dark:bg-black/40 dark:border-white/10"
                }`}
                aria-label={isFavorite(dish.id) ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={20} className={isFavorite(dish.id) ? "fill-current" : ""} />
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
