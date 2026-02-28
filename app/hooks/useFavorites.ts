"use client";

import { useCallback, useEffect, useState } from "react";

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    fetch("/api/favorites")
      .then((res) => (res.ok ? res.json() : { favoriteIds: [] }))
      .then((data: { favoriteIds?: string[] }) => {
        if (!cancelled && Array.isArray(data?.favoriteIds))
          setIds(data.favoriteIds);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mounted]);

  const toggle = useCallback((dishId: string) => {
    setIds((prev) => {
      const isCurrently = prev.includes(dishId);
      const next = isCurrently
        ? prev.filter((x) => x !== dishId)
        : [...prev, dishId];
      const method = isCurrently ? "DELETE" : "POST";
      const url =
        method === "DELETE"
          ? `/api/favorites?dish_id=${encodeURIComponent(dishId)}`
          : "/api/favorites";
      fetch(url, {
        method,
        ...(method === "POST" && {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dish_id: dishId }),
        }),
      }).catch(() => {
        fetch("/api/favorites")
          .then((r) => (r.ok ? r.json() : { favoriteIds: [] }))
          .then((d: { favoriteIds?: string[] }) => setIds(d?.favoriteIds ?? []));
      });
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (dishId: string) => ids.includes(dishId),
    [ids]
  );

  return { favoriteIds: ids, toggleFavorite: toggle, isFavorite };
}
