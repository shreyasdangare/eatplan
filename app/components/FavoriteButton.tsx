"use client";

import { useFavorites } from "../hooks/useFavorites";

export function FavoriteButton({ dishId }: { dishId: string }) {
  const { toggleFavorite, isFavorite } = useFavorites();
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(dishId)}
      className="text-lg leading-none"
      aria-label={isFavorite(dishId) ? "Remove from favorites" : "Add to favorites"}
    >
      {isFavorite(dishId) ? "❤️" : "🤍"}
    </button>
  );
}
