"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type DishData = {
  id: string;
  name: string;
  description?: string | null;
  prep_time_minutes?: number | null;
  servings?: number | null;
  dish_ingredients?: {
    id: string;
    quantity: string | null;
    amount: number | null;
    unit: string | null;
    is_optional: boolean;
    ingredients?: { name: string } | null;
  }[];
};

export default function CookModePage() {
  const params = useParams();
  const id = params?.id as string;
  const [dish, setDish] = useState<DishData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/dishes/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDish(data);
      }
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;
      try {
        wakeLock = await (navigator as any).wakeLock.request("screen");
      } catch {
        // ignore
      }
    }
    void requestWakeLock();
    return () => {
      wakeLock?.release?.().catch(() => {});
    };
  }, []);

  if (loading || !dish) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-lg text-amber-700">Loading…</p>
      </div>
    );
  }

  const required = (dish.dish_ingredients ?? []).filter((di) => !di.is_optional);
  const optional = (dish.dish_ingredients ?? []).filter((di) => di.is_optional);

  const qty = (di: (typeof required)[0]) =>
    di.amount != null && di.unit
      ? `${di.amount} ${di.unit}`
      : di.quantity ?? "—";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between">
        <Link
          href={`/dishes/${id}`}
          className="rounded-full bg-stone-400 px-4 py-2 text-sm font-medium text-white hover:bg-stone-500"
        >
          Exit cooking mode
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
        {dish.name}
      </h1>

      {dish.prep_time_minutes != null && (
        <p className="text-xl text-amber-700 dark:text-amber-300">
          Prep: {dish.prep_time_minutes} min
        </p>
      )}

      {dish.description && (
        <p className="text-xl leading-relaxed text-stone-700 dark:text-stone-300">
          {dish.description}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Ingredients
        </h2>
        <ul className="space-y-3 text-xl">
          {required.map((di) => (
            <li
              key={di.id}
              className="flex justify-between gap-4 border-b border-stone-200 pb-2 dark:border-stone-600"
            >
              <span>{di.ingredients?.name ?? "—"}</span>
              <span className="text-amber-700 dark:text-amber-300">{qty(di)}</span>
            </li>
          ))}
          {optional.length > 0 && (
            <>
              <li className="pt-2 text-lg font-medium text-stone-500 dark:text-stone-400">
                Optional
              </li>
              {optional.map((di) => (
                <li
                  key={di.id}
                  className="flex justify-between gap-4 border-b border-stone-200 pb-2 text-stone-600 dark:border-stone-600 dark:text-stone-400"
                >
                  <span>{di.ingredients?.name ?? "—"}</span>
                  <span>{qty(di)}</span>
                </li>
              ))}
            </>
          )}
        </ul>
      </section>

      <p className="text-sm text-stone-500 dark:text-stone-400">
        Screen will stay on while this page is open.
      </p>
    </div>
  );
}
