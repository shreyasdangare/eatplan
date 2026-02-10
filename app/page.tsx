import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabaseServer";

async function DishesList() {
  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select("id, name, meal_type")
    .order("name", { ascending: true });

  if (error || !dishes) {
    return (
      <p className="text-sm text-red-400">
        Failed to load dishes. Please try again.
      </p>
    );
  }

  if (!dishes.length) {
    return (
      <p className="text-sm text-slate-400">
        No dishes yet. Tap &ldquo;Add dish&rdquo; to create your first one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {dishes.map((dish) => (
        <li
          key={dish.id}
          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{dish.name}</p>
            {dish.meal_type && (
              <p className="text-[11px] uppercase tracking-wide text-slate-400">
                {dish.meal_type}
              </p>
            )}
          </div>
          <Link
            href={`/dishes/${dish.id}`}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-900"
          >
            View
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function DishesHomePage() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Dishes repository
          </h2>
          <p className="text-xs text-slate-400">
            Maintain all your dishes and their ingredients in one place.
          </p>
        </div>
        <Link
          href="/dishes/new"
          className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-emerald-400"
        >
          + Add dish
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-400">Loading…</p>}>
        <DishesList />
      </Suspense>
    </section>
  );
}

