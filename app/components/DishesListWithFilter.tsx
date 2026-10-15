"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFavorites } from "../hooks/useFavorites";
import { Heart, UtensilsCrossed, X, Search, SlidersHorizontal, CalendarPlus, Plus } from "lucide-react";
import { BottomSheet } from "./ui/BottomSheet";
import { AddToPlanSheet } from "./AddToPlanSheet";
import { RecipeImage } from "./RecipeImage";

type Dish = {
  id: string;
  name: string;
  meal_type?: string | null;
  tags?: string[] | null;
  image_url?: string | null;
};

type Diet = "Both" | "Veg" | "Non-Veg";

function isVegDish(d: Dish) {
  return (d.tags ?? []).some((t) => {
    const lower = t.toLowerCase();
    return lower === "veg" || lower === "vegetarian";
  });
}

export function DishesListWithFilter({ dishes, defaultVegOnly = false, children }: { dishes: Dish[]; defaultVegOnly?: boolean; children?: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const { favoriteIds, toggleFavorite, isFavorite } = useFavorites();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const defaultDiet: Diet = defaultVegOnly ? "Veg" : "Both";
  const [dietFilter, setDietFilter] = useState<Diet>(defaultDiet);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [planDish, setPlanDish] = useState<Dish | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    dishes.forEach((d) => (d.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    let list = dishes;
    if (searchQuery) {
      const lower = searchQuery.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(lower));
    }
    if (showFavoritesOnly) list = list.filter((d) => favoriteIds.includes(d.id));
    if (selectedTags.size > 0) list = list.filter((d) => (d.tags ?? []).some((t) => selectedTags.has(t)));
    if (dietFilter !== "Both") list = list.filter((d) => (dietFilter === "Veg" ? isVegDish(d) : !isVegDish(d)));
    return list;
  }, [dishes, searchQuery, selectedTags, showFavoritesOnly, favoriteIds, dietFilter]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  const activeFilterCount = selectedTags.size + (showFavoritesOnly ? 1 : 0) + (dietFilter !== defaultDiet ? 1 : 0);
  const clearAll = () => {
    setSelectedTags(new Set());
    setShowFavoritesOnly(false);
    setDietFilter(defaultDiet);
    setSearchQuery("");
  };

  if (!dishes.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-4xl glass-panel p-10 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-stone-800 dark:text-orange-400">
          <UtensilsCrossed size={32} aria-hidden />
        </div>
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">No recipes yet</h2>
        <p className="mt-2 max-w-sm text-sm text-stone-600 dark:text-stone-300">
          Paste a link, type a dish name or snap a photo of a recipe and we&apos;ll do the rest.
        </p>
        <Link href="/dishes/new" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-orange-600 px-6 font-bold text-white">
          <Plus className="h-5 w-5" aria-hidden /> Add your first recipe
        </Link>
      </div>
    );
  }

  const chip = (on: boolean) =>
    `shrink-0 min-h-11 rounded-full border px-4 text-sm font-semibold transition-all active:scale-95 ${
      on
        ? "border-stone-800 bg-stone-800 text-white dark:border-stone-200 dark:bg-stone-200 dark:text-stone-900"
        : "border-stone-300 bg-white/60 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200 dark:hover:bg-stone-700"
    }`;

  const dietButtons = (
    <div className="flex items-center rounded-full bg-stone-100/80 p-1 shadow-inner dark:bg-stone-800/80" role="radiogroup" aria-label="Diet">
      {(["Both", "Veg", "Non-Veg"] as const).map((diet) => (
        <button
          key={diet}
          type="button"
          role="radio"
          aria-checked={dietFilter === diet}
          onClick={() => setDietFilter(diet)}
          className={`min-h-10 flex-1 rounded-full px-3 text-sm font-bold transition-all active:scale-[0.98] ${
            dietFilter === diet
              ? diet === "Veg"
                ? "bg-emerald-700 text-white shadow-xs"
                : diet === "Non-Veg"
                ? "bg-rose-700 text-white shadow-xs"
                : "bg-white text-stone-900 shadow-xs dark:bg-stone-700 dark:text-stone-100"
              : "text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-100"
          }`}
        >
          {diet === "Both" ? "All" : diet}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="sticky top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)] z-40 rounded-3xl glass-panel bg-white/90 p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-stone-900/90 sm:top-24 sm:p-5">
        <div className="flex items-center gap-2 sm:mb-4 sm:gap-4">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500 dark:text-stone-400" aria-hidden />
            <input
              type="search"
              placeholder="Search recipes…"
              aria-label="Search recipes"
              enterKeyHint="search"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-12 w-full rounded-full border border-stone-200/60 bg-stone-100/60 pl-10 pr-11 text-base text-stone-900 placeholder:text-stone-500 focus:border-orange-400/50 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/50 dark:bg-stone-800/60 dark:text-stone-100 dark:focus:bg-stone-900 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-700"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" strokeWidth={3} aria-hidden />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="relative flex h-12 shrink-0 items-center gap-2 rounded-full border border-stone-300 bg-white/70 px-4 text-sm font-semibold text-stone-800 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-100 sm:hidden"
            aria-label={`Filters${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-bold text-white" aria-hidden>
                {activeFilterCount}
              </span>
            )}
          </button>
          <Link
            href="/dishes/new"
            aria-label="Add recipe"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-600 text-white shadow-md active:scale-95 sm:hidden"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Link>
          {children && <div className="hidden shrink-0 items-center justify-end sm:flex">{children}</div>}
        </div>

        {/* Desktop filter strip */}
        <div className="-mx-1 hidden flex-nowrap items-center gap-2 overflow-x-auto px-1 pb-2 scrollbar-hide sm:flex lg:gap-3">
          <button type="button" aria-pressed={showFavoritesOnly} onClick={() => setShowFavoritesOnly((v) => !v)} className={`${chip(showFavoritesOnly)} flex items-center gap-2`}>
            <Heart size={16} className={showFavoritesOnly ? "fill-current" : ""} aria-hidden />
            Favorites
          </button>
          <div className="shrink-0">{dietButtons}</div>
          <div className="mx-1 h-6 w-px bg-stone-200 dark:bg-stone-700" aria-hidden />
          {allTags.map((tag) => (
            <button key={tag} type="button" aria-pressed={selectedTags.has(tag)} onClick={() => toggleTag(tag)} className={chip(selectedTags.has(tag))}>
              {tag}
            </button>
          ))}
          {(activeFilterCount > 0 || searchQuery) && (
            <button type="button" onClick={clearAll} className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-stone-600 hover:bg-stone-200/50 dark:text-stone-300">
              <X size={16} aria-hidden /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Mobile: active filters summary */}
      {activeFilterCount > 0 && (
        <div className="-mt-1 flex items-center justify-between gap-2 px-1 sm:hidden">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-200">
            {filteredDishes.length} of {dishes.length} recipes
          </p>
          <button type="button" onClick={clearAll} className="min-h-11 rounded-full px-3 text-sm font-semibold text-orange-700 dark:text-orange-300">
            Clear filters
          </button>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {filteredDishes.length === 0 ? (
          <li className="col-span-full flex min-h-[200px] flex-col items-center justify-center rounded-4xl border border-dashed border-stone-300 bg-stone-50/50 p-6 text-center dark:border-stone-700 dark:bg-stone-800/30">
            <p className="text-base font-medium text-stone-700 dark:text-stone-200">No recipes match your filters.</p>
            <button type="button" onClick={clearAll} className="mt-3 min-h-11 px-4 font-semibold text-orange-700 hover:underline dark:text-orange-300">
              Clear filters
            </button>
          </li>
        ) : (
          filteredDishes.map((dish, i) => (
            <li key={dish.id} className="group/card relative">
              <Link
                href={`/dishes/${dish.id}`}
                className="block overflow-hidden rounded-3xl glass-panel transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:rounded-4xl"
              >
                <div className="relative aspect-4/5 w-full overflow-hidden bg-stone-100 dark:bg-stone-800 sm:aspect-4/3">
                  {dish.image_url ? (
                    <RecipeImage
                      src={dish.image_url}
                      alt=""
                      priority={i < 2}
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, calc(50vw - 24px)"
                      className="object-cover transition-transform duration-700 ease-out group-hover/card:scale-110"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-stone-400 dark:text-stone-500">
                      <UtensilsCrossed size={40} strokeWidth={1.5} aria-hidden />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-stone-950/90 via-stone-950/25 to-transparent" aria-hidden />
                  <div className="absolute inset-x-0 bottom-0 z-10 p-3 pr-14 sm:p-6 sm:pr-16">
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-tight text-white drop-shadow-md sm:text-xl">{dish.name}</h3>
                    {dish.meal_type && dish.meal_type !== "both" && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/90">{dish.meal_type}</p>
                    )}
                  </div>
                </div>
              </Link>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleFavorite(dish.id);
                }}
                aria-pressed={isFavorite(dish.id)}
                className={`absolute right-2 top-2 z-20 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur-md transition-all active:scale-90 sm:right-4 sm:top-4 ${
                  isFavorite(dish.id)
                    ? "bg-white text-rose-600 dark:bg-stone-800 dark:text-rose-400"
                    : "border border-white/30 bg-black/30 text-white hover:bg-black/50"
                }`}
                aria-label={isFavorite(dish.id) ? `Remove ${dish.name} from favorites` : `Add ${dish.name} to favorites`}
              >
                <Heart size={20} className={isFavorite(dish.id) ? "fill-current" : ""} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setPlanDish(dish)}
                aria-label={`Add ${dish.name} to plan`}
                className="absolute bottom-2 right-2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg transition-all active:scale-90 sm:bottom-4 sm:right-4"
              >
                <CalendarPlus className="h-5 w-5" aria-hidden />
              </button>
            </li>
          ))
        )}
      </ul>

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="flex gap-2">
            <button type="button" onClick={clearAll} className="min-h-12 rounded-full border border-stone-300 px-5 font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-100">
              Reset
            </button>
            <button type="button" onClick={() => setFiltersOpen(false)} className="min-h-12 flex-1 rounded-full bg-orange-600 font-bold text-white">
              Show {filteredDishes.length} recipe{filteredDishes.length === 1 ? "" : "s"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <button type="button" aria-pressed={showFavoritesOnly} onClick={() => setShowFavoritesOnly((v) => !v)} className={`${chip(showFavoritesOnly)} flex items-center gap-2`}>
            <Heart size={16} className={showFavoritesOnly ? "fill-current" : ""} aria-hidden />
            Favorites only
          </button>
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">Diet</p>
            {dietButtons}
          </div>
          {allTags.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">Tags</p>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => (
                  <button key={tag} type="button" aria-pressed={selectedTags.has(tag)} onClick={() => toggleTag(tag)} className={chip(selectedTags.has(tag))}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      <AddToPlanSheet dish={planDish} open={!!planDish} onClose={() => setPlanDish(null)} />
    </div>
  );
}
