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
      <p className="text-sm text-amber-700">
        No dishes yet. Tap “Add dish” to create your first one.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {dishes.map((dish) => (
        <li
          key={dish.id}
          className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-2 text-sm shadow-sm"
        >
          <div>
            <p className="font-medium">{dish.name}</p>
            {dish.meal_type && (
              <p className="text-[11px] uppercase tracking-wide text-amber-700">
                {dish.meal_type}
              </p>
            )}
          </div>
          <Link
            href={`/dishes/${dish.id}`}
            className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
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
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            Dishes repository
          </h2>
          <p className="text-xs text-amber-700">
            Maintain all your dishes and their ingredients in one place.
          </p>
        </div>
        <Link
          href="/dishes/new"
          className="rounded-full bg-lime-500 px-3 py-1.5 text-xs font-semibold text-lime-950 shadow-sm hover:bg-lime-400"
        >
          + Add dish
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-amber-700">Loading…</p>}>
        <DishesList />
      </Suspense>
    </section>
  );
}

