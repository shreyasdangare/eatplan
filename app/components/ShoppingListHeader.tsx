"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, Copy } from "lucide-react";

type IngredientOption = { id: string; name: string };

type ShoppingListHeaderProps = {
  onAddFromMealPlan: () => void;
  onCopyList: () => void;
  onAddItem: (item: { ingredient_id?: string; custom_name?: string; quantity?: string; category?: string; name?: string }) => void;
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
        onAddItem({ ingredient_id: ing.id, custom_name: undefined, name: ing.name });
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
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
          Shopping list
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAddFromMealPlan}
            disabled={populateLoading}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-amber-100 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:hover:bg-amber-800/60 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden />
            {populateLoading ? "Adding…" : "From plan"}
          </button>
          {toBuyCount > 0 && (
            <button
              type="button"
              onClick={onCopyList}
              aria-label="Copy list to clipboard"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              <Copy className="h-4 w-4" aria-hidden />
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
          placeholder="Add an item, e.g. milk"
          aria-label="Search or add item"
          role="combobox"
          aria-controls="shopping-add-results"
          aria-autocomplete="list"
          aria-expanded={open && (searchResults.length > 0 || showCreateNew)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          className="min-h-12 w-full rounded-xl border border-orange-200 bg-white px-3.5 text-base placeholder:text-stone-500 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-400"
        />
        {open && (searchResults.length > 0 || showCreateNew) && (
          <ul
            id="shopping-add-results"
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-orange-200 bg-white shadow-lg dark:border-stone-600 dark:bg-stone-800"
          >
            {searching && searchResults.length === 0 && (
              <li className="px-3.5 py-2 text-sm text-amber-800 dark:text-amber-200">
                Searching…
              </li>
            )}
            {searchResults.map((ing) => (
              <li
                key={ing.id}
                role="option"
                aria-selected={false}
                className="flex min-h-11 cursor-pointer items-center px-3.5 text-base text-stone-800 hover:bg-orange-50 dark:text-stone-200 dark:hover:bg-stone-700"
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
                aria-selected={false}
                className="flex min-h-11 cursor-pointer items-center px-3.5 text-base font-semibold text-amber-800 hover:bg-orange-50 dark:text-amber-300 dark:hover:bg-stone-700"
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
