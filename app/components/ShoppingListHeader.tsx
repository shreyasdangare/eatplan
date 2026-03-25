"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type IngredientOption = { id: string; name: string };

type ShoppingListHeaderProps = {
  onAddFromMealPlan: () => void;
  onCopyList: () => void;
  onAddItem: (item: { ingredient_id?: string; custom_name?: string; quantity?: string; category?: string }) => void;
  toBuyCount: number;
  populateLoading?: boolean;
};

export function ShoppingListHeader({
  onAddFromMealPlan,
  onCopyList,
  onAddItem,
  toBuyCount,
  populateLoading,
}: ShoppingListHeaderProps) {
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<IngredientOption[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchValue.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/ingredients/search?query=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { ingredients: { id: string; name: string }[] };
        setSearchResults(data.ingredients ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [searchValue]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const showCreateNew = useMemo(() => {
    const q = searchValue.trim().toLowerCase();
    if (!q || q.length < 1) return false;
    const exact = searchResults.some((r) => r.name.toLowerCase() === q);
    return !exact;
  }, [searchValue, searchResults]);

  const handleSelect = useCallback(
    (ing: IngredientOption | null, customName?: string) => {
      if (ing) {
        onAddItem({ ingredient_id: ing.id, custom_name: undefined });
      } else if (customName) {
        onAddItem({ custom_name: customName.trim() });
      }
      setSearchValue("");
      setOpen(false);
    },
    [onAddItem]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchValue.trim()) {
      e.preventDefault();
      const exact = searchResults.find(
        (r) => r.name.toLowerCase() === searchValue.trim().toLowerCase()
      );
      if (exact) handleSelect(exact);
      else handleSelect(null, searchValue.trim());
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          List
        </h2>
        <div className="flex items-center gap-1.5">
          <Link
            href="/"
            className="rounded-full bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500"
          >
            Home
          </Link>
          <button
            type="button"
            onClick={onAddFromMealPlan}
            disabled={populateLoading}
            className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700 disabled:opacity-50"
          >
            {populateLoading ? "…" : "Meal plan"}
          </button>
          {toBuyCount > 0 && (
            <button
              type="button"
              onClick={onCopyList}
              className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-100 dark:hover:bg-amber-700"
            >
              Copy
            </button>
          )}
        </div>
      </div>

      <div className="relative" ref={containerRef}>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => searchValue.trim() && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search or add item…"
          className="w-full rounded-lg border border-orange-200 bg-white px-2.5 py-2 text-sm placeholder:text-amber-400 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500"
          aria-autocomplete="list"
          aria-expanded={open && (searchResults.length > 0 || showCreateNew)}
        />
        {open && (searchResults.length > 0 || showCreateNew) && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-orange-200 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800"
          >
            {searching && searchResults.length === 0 && (
              <li className="px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                Searching…
              </li>
            )}
            {searchResults.map((ing) => (
              <li
                key={ing.id}
                role="option"
                className="cursor-pointer px-3 py-2 text-sm text-stone-800 hover:bg-orange-50 dark:text-stone-200 dark:hover:bg-stone-700"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(ing);
                }}
              >
                {ing.name}
              </li>
            ))}
            {showCreateNew && (
              <li
                role="option"
                className="cursor-pointer px-3 py-2 text-sm text-amber-700 hover:bg-orange-50 dark:text-amber-400 dark:hover:bg-stone-700"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(null, searchValue.trim());
                }}
              >
                Add &quot;{searchValue.trim()}&quot;
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
