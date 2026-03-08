"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";

export type IngredientOption = {
  id: string;
  name: string;
};

type SearchMatch = {
  id: string;
  name: string;
  score: number;
};

type IngredientAutocompleteInputProps = {
  label?: string;
  placeholder?: string;
  ingredients: IngredientOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectExisting: (ingredient: IngredientOption) => void;
  onCreateNew: (name: string) => void;
  disabled?: boolean;
};

type LocalSuggestion = {
  type: "existing" | "create";
  ingredient?: IngredientOption;
  label: string;
};

export function IngredientAutocompleteInput({
  label = "Ingredients",
  placeholder = "Search or add ingredient...",
  ingredients,
  value,
  onChange,
  onSelectExisting,
  onCreateNew,
  disabled
}: IngredientAutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [remoteMatches, setRemoteMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = "ingredient-autocomplete-listbox";

  // fire fuzzy search when there are few local matches and query is long enough
  useEffect(() => {
    const query = value.trim();
    if (!query || query.length < 2) {
      setRemoteMatches([]);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(
          `/api/ingredients/search?query=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setRemoteMatches([]);
          return;
        }
        const data = (await res.json()) as {
          ingredients: SearchMatch[];
        };
        setRemoteMatches(data.ingredients ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setRemoteMatches([]);
        }
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [value]);

  const suggestions: LocalSuggestion[] = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];

    const localMatches = ingredients
      .filter((ing) => ing.name.toLowerCase().includes(query))
      .slice(0, 8)
      .map<LocalSuggestion>((ing) => ({
        type: "existing",
        ingredient: ing,
        label: ing.name
      }));

    const remoteSuggestions: LocalSuggestion[] = remoteMatches
      .filter((m) => !ingredients.find((ing) => ing.id === m.id))
      .map((m) => ({
        type: "existing" as const,
        ingredient: { id: m.id, name: m.name },
        label: m.score >= 0.9 ? `Did you mean: ${m.name}?` : m.name
      }));

    const matches = [...localMatches, ...remoteSuggestions];

    const exactMatch = ingredients.some(
      (ing) => ing.name.toLowerCase() === query
    );

    const items = [...matches];

    if (!exactMatch) {
      items.push({
        type: "create",
        label: `Create new: "${value.trim()}"`
      });
    }

    return items;
  }, [ingredients, value, remoteMatches]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (item: LocalSuggestion) => {
    if (item.type === "existing" && item.ingredient) {
      onSelectExisting(item.ingredient);
      onChange("");
    } else if (item.type === "create") {
      onCreateNew(value.trim());
      onChange("");
    }
    setIsOpen(false);
    setActiveIndex(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) {
      if (event.key === "Enter" && value.trim()) {
        event.preventDefault();
        onCreateNew(value.trim());
        onChange("");
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => {
        if (prev === null) return 0;
        return (prev + 1) % suggestions.length;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((prev) => {
        if (prev === null) return suggestions.length - 1;
        return (prev - 1 + suggestions.length) % suggestions.length;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex !== null) {
        handleSelect(suggestions[activeIndex]);
      } else if (value.trim()) {
        // No active suggestion, create new by default
        onCreateNew(value.trim());
        onChange("");
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(null);
    }
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-bold text-stone-700 dark:text-stone-300">
          {label}
        </label>
      )}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-stone-400" />
          <input
            className="w-full rounded-xl border border-stone-200/80 bg-stone-50/50 pl-10 pr-4 py-3 text-sm text-stone-900 shadow-sm transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/80 dark:bg-stone-900/50 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:bg-stone-800 disabled:opacity-60"
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
              setActiveIndex(null);
            }}
            onFocus={() => {
              if (value.trim()) {
                setIsOpen(true);
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-autocomplete="list"
          />
        </div>
        {isOpen && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-stone-200 bg-white p-1.5 text-sm shadow-xl dark:border-stone-700 dark:bg-stone-800"
          >
            {suggestions.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={`${item.type}-${item.ingredient?.id ?? "create"}`}
                  role="option"
                  aria-selected={isActive}
                  className={`cursor-pointer rounded-lg px-3 py-2 transition-colors ${
                    isActive
                      ? "bg-orange-50 font-medium text-orange-900 dark:bg-stone-700 dark:text-stone-100"
                      : "text-stone-700 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-700/50"
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {item.label}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

