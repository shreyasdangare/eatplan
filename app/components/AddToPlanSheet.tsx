"use client";

import { useMemo, useState } from "react";
import { Sun, Utensils, Moon } from "lucide-react";
import { BottomSheet } from "./ui/BottomSheet";
import { toast } from "./ui/Toast";
import { addDays, currentSlot, relativeDayLabel, toISODate } from "@/lib/dates";
import { isMealPast } from "@/lib/isMealPast";

const SLOTS = [
  { id: "breakfast", label: "Breakfast", icon: Sun },
  { id: "lunch", label: "Lunch", icon: Utensils },
  { id: "dinner", label: "Dinner", icon: Moon },
] as const;
type Slot = (typeof SLOTS)[number]["id"];

/** Two taps from any recipe to the plan: pick a day (defaults to today), tap a meal. */
export function AddToPlanSheet({
  dish,
  open,
  onClose,
  onAdded,
}: {
  dish: { id: string; name: string; meal_type?: string | null } | null;
  open: boolean;
  onClose: () => void;
  onAdded?: (date: string, slot: Slot) => void;
}) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 10 }, (_, i) => toISODate(addDays(today, i)));
  }, []);
  const [day, setDay] = useState(days[0]);
  const [saving, setSaving] = useState<Slot | null>(null);

  if (!dish) return null;
  const suggested: Slot =
    dish.meal_type === "breakfast" || dish.meal_type === "lunch" || dish.meal_type === "dinner"
      ? dish.meal_type
      : currentSlot();

  const add = async (slot: Slot) => {
    setSaving(slot);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: day, slot_type: slot, dish_id: dish.id }),
      });
      if (!res.ok) throw new Error();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(10);
      onAdded?.(day, slot);
      onClose();
      toast({
        message: `Added to ${relativeDayLabel(day)} · ${SLOTS.find((s) => s.id === slot)!.label}`,
        action: { label: "View plan", href: `/plan?date=${day}` },
      });
    } catch {
      toast({ message: "Couldn't add to plan. Try again.", tone: "error" });
    } finally {
      setSaving(null);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add to plan" subtitle={dish.name}>
      <p id="plan-day-label" className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">
        Day
      </p>
      <div
        role="radiogroup"
        aria-labelledby="plan-day-label"
        className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-hide"
      >
        {days.map((d) => {
          const selected = d === day;
          return (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setDay(d)}
              className={`flex min-h-12 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition-colors ${
                selected
                  ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900"
                  : "border-stone-300 bg-white text-stone-800 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              }`}
            >
              {relativeDayLabel(d)}
            </button>
          );
        })}
      </div>
      <p className="mb-2 text-sm font-semibold text-stone-700 dark:text-stone-200">Meal</p>
      <div className="grid gap-2">
        {SLOTS.map((s) => {
          const Icon = s.icon;
          const past = isMealPast(day, s.id);
          const isSuggested = s.id === suggested && !past;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!!saving}
              onClick={() => add(s.id)}
              data-autofocus={isSuggested ? "" : undefined}
              className={`flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 text-left text-base font-bold transition-all active:scale-[0.98] disabled:opacity-60 ${
                isSuggested
                  ? "border-orange-600 bg-orange-50 text-orange-900 dark:border-orange-500 dark:bg-orange-500/15 dark:text-orange-100"
                  : "border-stone-200 bg-white text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="flex-1">{s.label}</span>
              {past && <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">earlier today</span>}
              {saving === s.id ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </BottomSheet>
  );
}
