 "use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  placeholder = "Add new ingredient (e.g., tomato)",
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
        label:
          m.score >= 0.9 ? `Did you mean: ${m.name}?` : m.name
      }));

    const matches = [...localMatches, ...remoteSuggestions];

    const exactMatch = ingredients.some(
      (ing) => ing.name.toLowerCase() === query
    );

    const items = [...matches];

    if (!exactMatch) {
      items.push({
        type: "create",
        label: `Create new ingredient: "${value.trim()}"`
      });
    }

    return items;
  }, [ingredients, value]);

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
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs text-slate-300">{label}</label>
      </div>
      <div className="relative">
        <input
          className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs"
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
        {isOpen && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-800 bg-slate-900 text-xs shadow-lg"
          >
            {suggestions.map((item, index) => {
              const isActive = index === activeIndex;
              return (
                <li
                  key={`${item.type}-${item.ingredient?.id ?? "create"}`}
                  role="option"
                  aria-selected={isActive}
                  className={`cursor-pointer px-3 py-1.5 ${
                    isActive ? "bg-slate-800 text-slate-50" : "text-slate-100"
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

