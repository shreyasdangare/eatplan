"use client";

import { getItemEmoji } from "@/lib/categoryEmoji";

export type ShoppingTileItem = {
  id: string;
  ingredient_id?: string | null;
  custom_name?: string | null;
  ingredient_name?: string | null;
  quantity?: string | null;
  category?: string | null;
  status: "to_buy" | "bought";
  urgency?: "normal" | "urgent" | "if_convenient";
  source?: "meal_plan" | "manual";
  notes?: string | null;
  bought_at?: string | null;
};

type ShoppingTileProps = {
  item: ShoppingTileItem;
  onTap: (item: ShoppingTileItem) => void;
  onOpenDetail: (item: ShoppingTileItem) => void;
  disabled?: boolean;
  animating?: boolean;
};

function displayName(item: ShoppingTileItem): string {
  return item.ingredient_name ?? item.custom_name ?? "Unknown";
}

export function ShoppingTile({
  item,
  onTap,
  onOpenDetail,
  disabled,
  animating,
}: ShoppingTileProps) {
  const name = displayName(item);
  const emoji = getItemEmoji(item.category ?? null, name);
  const isBought = item.status === "bought";

  const handleClick = () => {
    if (disabled || animating) return;
    onTap(item);
  };

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || animating) return;
    onOpenDetail(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled || animating) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
      className={`
        relative flex min-h-[40px] w-full cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors duration-150
        focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 dark:focus:ring-offset-stone-900
        [&:has(button:focus)]:ring-2 [&:has(button:focus)]:ring-orange-400 [&:has(button:focus)]:ring-offset-2
        ${disabled ? "pointer-events-none opacity-60" : ""}
        ${animating ? "animate-buy" : ""}
        ${isBought
          ? "border-lime-200 bg-lime-50/80 dark:border-lime-800 dark:bg-lime-950/40"
          : item.urgency === "urgent"
            ? "border-red-300 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30"
            : "border-orange-200 bg-orange-50/90 dark:border-stone-600 dark:bg-stone-800/90"
        }
      `}
    >
      {/* Checkmark overlay during buy animation */}
      {animating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-lime-500/20 dark:bg-lime-500/10">
          <svg className="h-8 w-8 text-lime-600 dark:text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" className="animate-checkmark" />
          </svg>
        </div>
      )}
      <span className="text-lg leading-none shrink-0" aria-hidden>
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-medium ${isBought
              ? "text-lime-700 dark:text-lime-400"
              : "text-amber-900 dark:text-stone-200"
            }`}
        >
          {name}
        </span>
        {item.quantity && (
          <span
            className={`block truncate text-xs ${isBought
                ? "text-lime-600 dark:text-lime-500"
                : "text-amber-700 dark:text-amber-300"
              }`}
          >
            {item.quantity}
          </span>
        )}
      </div>
      {item.urgency === "urgent" && !isBought && (
        <span
          className="rounded-full bg-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-900/60 dark:text-red-200"
          title="Urgent"
        >
          !
        </span>
      )}
      <button
        type="button"
        onClick={handleDetailClick}
        disabled={disabled || animating}
        aria-label={`Edit ${name}`}
        className="ml-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-600 hover:bg-amber-200/80 dark:text-amber-400 dark:hover:bg-stone-700"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </div>
  );
}
