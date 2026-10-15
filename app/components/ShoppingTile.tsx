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
  /** dnd-kit sortable attributes, applied to the main button (keeps it a single interactive element). */
  dragAttributes?: Record<string, unknown>;
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
  dragAttributes,
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

  return (
    <div
      className={`
        relative flex min-h-[52px] w-full items-stretch rounded-xl border transition-colors duration-150
        ${disabled ? "pointer-events-none opacity-60" : ""}
        ${animating ? "animate-buy" : ""}
        ${isBought
          ? "border-lime-200 bg-lime-50/80 dark:border-lime-800 dark:bg-lime-950/40"
          : item.urgency === "urgent"
            ? "border-red-300 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30"
            : "border-orange-200 bg-white dark:border-stone-700 dark:bg-stone-800/90"
        }
      `}
    >
      {/* Checkmark overlay during buy animation */}
      {animating && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-lime-500/20 dark:bg-lime-500/10" aria-hidden>
          <svg className="h-8 w-8 text-lime-600 dark:text-lime-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" className="animate-checkmark" />
          </svg>
        </div>
      )}
      <button
        type="button"
        {...dragAttributes}
        onClick={handleClick}
        disabled={disabled || animating}
        aria-pressed={isBought}
        aria-label={`${name}${item.quantity ? `, ${item.quantity}` : ""}${item.urgency === "urgent" ? ", urgent" : ""}. ${isBought ? "Bought – tap to put back on the list" : "Tap to mark as bought"}`}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-l-xl py-2 pl-2.5 pr-1 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500"
      >
        <span className="text-lg leading-none shrink-0" aria-hidden>
          {emoji}
        </span>
        <span className="min-w-0 flex-1" aria-hidden>
          <span
            className={`block truncate text-[15px] font-semibold leading-tight ${isBought
                ? "text-lime-800 line-through decoration-lime-500/60 dark:text-lime-300"
                : "text-stone-900 dark:text-stone-100"
              }`}
          >
            {name}
          </span>
          {item.quantity && (
            <span
              className={`mt-0.5 block truncate text-xs font-medium ${isBought
                  ? "text-lime-700 dark:text-lime-400"
                  : "text-amber-800 dark:text-amber-200"
                }`}
            >
              {item.quantity}
            </span>
          )}
        </span>
        {item.urgency === "urgent" && !isBought && (
          <span
            className="shrink-0 rounded-full bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-800 dark:bg-red-900/60 dark:text-red-100"
            aria-hidden
          >
            !
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={handleDetailClick}
        disabled={disabled || animating}
        aria-label={`Edit ${name}`}
        className="flex w-11 shrink-0 items-center justify-center rounded-r-xl text-amber-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-orange-500 dark:text-amber-300 dark:hover:bg-stone-700"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01"
          />
        </svg>
      </button>
    </div>
  );
}
