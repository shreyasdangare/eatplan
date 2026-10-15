"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ListChecks, Sun, X } from "lucide-react";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { Skeleton, LoadingRegion } from "@/app/components/ui/Skeleton";

type Dish = {
  id: string;
  name: string;
  instructions?: string | null;
  dish_ingredients?: {
    id: string;
    quantity?: string | null;
    amount?: number | null;
    unit?: string | null;
    is_optional?: boolean;
    ingredients?: { name: string } | null;
  }[];
};

type WakeLockSentinelLike = { release: () => Promise<void> };

function toSteps(instructions: string | null | undefined): string[] {
  return (instructions ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*(step\s*)?\d+[.):-]\s*/i, "").trim())
    .filter(Boolean);
}

/** Hands-free cooking: one step per screen, big text, screen kept awake, swipe or tap to move. */
export default function CookModePage() {
  const params = useParams();
  const id = params?.id as string;
  const [dish, setDish] = useState<Dish | null>(null);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [awake, setAwake] = useState(false);
  const lock = useRef<WakeLockSentinelLike | null>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dishes/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Dish) => !cancelled && setDish(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Keep the screen on while cooking (re-acquired when the tab becomes visible again).
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } };
    if (!nav.wakeLock) return;
    const acquire = async () => {
      try {
        lock.current = await nav.wakeLock!.request("screen");
        setAwake(true);
      } catch {
        setAwake(false);
      }
    };
    void acquire();
    const onVis = () => document.visibilityState === "visible" && void acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void lock.current?.release();
    };
  }, []);

  const steps = toSteps(dish?.instructions);
  const total = steps.length;
  const go = useCallback((delta: number) => setStep((s) => Math.min(Math.max(0, s + delta), Math.max(0, total - 1))), [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  if (error) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">Couldn&apos;t load this recipe.</p>
        <Link href={`/dishes/${id}`} className="min-h-12 rounded-full bg-orange-600 px-6 py-3 font-bold text-white">
          Back to recipe
        </Link>
      </div>
    );
  }

  if (!dish) {
    return (
      <LoadingRegion label="Loading cooking mode">
        <div className="space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-48 w-full rounded-3xl" />
        </div>
      </LoadingRegion>
    );
  }

  const ingredients = dish.dish_ingredients ?? [];

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/dishes/${id}`}
          aria-label="Exit cooking mode"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-100"
        >
          <X className="h-5 w-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight text-stone-900 dark:text-stone-50">{dish.name}</h1>
          <p className="flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300">
            {awake ? (
              <>
                <Sun className="h-3.5 w-3.5" aria-hidden /> Screen stays on
              </>
            ) : (
              "Cooking mode"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowIngredients(true)}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-stone-100 px-4 text-sm font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-100"
        >
          <ListChecks className="h-4 w-4" aria-hidden />
          Ingredients
        </button>
      </div>

      {total === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-stone-300 p-8 text-center dark:border-stone-700">
          <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">This recipe has no steps yet.</p>
          <Link href={`/dishes/${id}/edit`} className="min-h-12 rounded-full bg-orange-600 px-6 py-3 font-bold text-white">
            Add instructions
          </Link>
        </div>
      ) : (
        <>
          <div
            className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={step + 1}
            aria-label="Step progress"
          >
            <div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
          </div>
          <section
            aria-live="polite"
            className="flex flex-1 flex-col rounded-3xl glass-panel p-6"
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
              touchX.current = null;
            }}
          >
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-orange-700 dark:text-orange-300">
              Step {step + 1} of {total}
            </p>
            <p className="text-2xl font-semibold leading-snug text-stone-900 dark:text-stone-50">{steps[step]}</p>
          </section>
          <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] mt-4 grid grid-cols-2 gap-3 sm:bottom-4">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={step === 0}
              className="flex min-h-14 items-center justify-center gap-2 rounded-full border-2 border-stone-300 bg-white text-base font-bold text-stone-800 disabled:opacity-40 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden /> Back
            </button>
            {step < total - 1 ? (
              <button
                type="button"
                onClick={() => go(1)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-orange-600 text-base font-bold text-white"
              >
                Next <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            ) : (
              <Link
                href={`/dishes/${id}`}
                className="flex min-h-14 items-center justify-center rounded-full bg-emerald-700 text-base font-bold text-white"
              >
                Done 🎉
              </Link>
            )}
          </div>
        </>
      )}

      <BottomSheet open={showIngredients} onClose={() => setShowIngredients(false)} title="Ingredients" subtitle="Tick them off as you go">
        <ul className="divide-y divide-stone-200 dark:divide-stone-800">
          {ingredients.map((di) => {
            const qty = di.amount != null && di.unit ? `${di.amount} ${di.unit}` : di.quantity ?? "";
            const on = checked.has(di.id);
            return (
              <li key={di.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setChecked((prev) => {
                        const n = new Set(prev);
                        if (n.has(di.id)) n.delete(di.id);
                        else n.add(di.id);
                        return n;
                      })
                    }
                    className="h-6 w-6 shrink-0 accent-orange-600"
                  />
                  <span className={`flex-1 text-base ${on ? "text-stone-500 line-through dark:text-stone-400" : "text-stone-900 dark:text-stone-100"}`}>
                    {di.ingredients?.name ?? "Ingredient"}
                    {di.is_optional ? <span className="ml-1 text-sm text-stone-600 dark:text-stone-300">(optional)</span> : null}
                  </span>
                  {qty ? <span className="shrink-0 text-sm font-semibold text-stone-700 dark:text-stone-200">{qty}</span> : null}
                </label>
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </div>
  );
}
