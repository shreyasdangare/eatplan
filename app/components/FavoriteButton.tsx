"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "../hooks/useFavorites";

export function FavoriteButton({ dishId }: { dishId: string }) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const fav = isFavorite(dishId);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(dishId)}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favorites" : "Add to favorites"}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90 ${
        fav
          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
          : "border-stone-200 bg-white/60 text-stone-600 hover:text-rose-600 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-300"
      }`}
    >
      <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} aria-hidden />
    </button>
  );
}
