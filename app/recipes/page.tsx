import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { DishesListWithFilter } from "../components/DishesListWithFilter";

async function DishesList() {
  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select("id, name, meal_type, tags")
    .order("name", { ascending: true });

  if (error || !dishes) {
    return (
      <p className="text-sm text-red-400">
        Failed to load dishes. Please try again.
      </p>
    );
  }

  return <DishesListWithFilter dishes={dishes} />;
}

export default function RecipesPage() {
  return (
    <section className="space-y-5 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-amber-900 lg:text-xl dark:text-amber-200">
            Recipes
          </h2>
          <p className="mt-0.5 text-sm text-amber-700 dark:text-amber-300">
            Your recipe collection. Add recipes and ingredients, filter by tag or favorites.
          </p>
        </div>
        <Link
          href="/dishes/new"
          className="shrink-0 rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-lime-950 shadow-sm hover:bg-lime-400"
        >
          + Add recipe
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-amber-700">Loading…</p>}>
        <DishesList />
      </Suspense>
    </section>
  );
}
