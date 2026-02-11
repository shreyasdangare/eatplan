"use client";

import { useCallback, useEffect, useState } from "react";

const FAVORITES_KEY = "jevan-favorites";

function loadFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) setIds(loadFavorites());
  }, [mounted]);

  const toggle = useCallback((dishId: string) => {
    setIds((prev) => {
      const next = prev.includes(dishId)
        ? prev.filter((x) => x !== dishId)
        : [...prev, dishId];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (dishId: string) => ids.includes(dishId),
    [ids]
  );

  return { favoriteIds: ids, toggleFavorite: toggle, isFavorite };
}
