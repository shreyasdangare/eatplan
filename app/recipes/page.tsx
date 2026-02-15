import Link from "next/link";
import { Suspense } from "react";
import { supabaseServer } from "@/lib/supabaseServer";
import { DishesListWithFilter } from "../components/DishesListWithFilter";
import { RecipesSheetActions } from "../components/RecipesSheetActions";

async function DishesList() {
  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select("id, name, meal_type, tags, image_url")
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
    <section className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Your collection. Add from URL or screenshot, filter by tag or favorites.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <RecipesSheetActions />
          <Link
            href="/dishes/new"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <span aria-hidden>+</span> Add recipe
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-48 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-700" /><div className="h-48 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-700" /><div className="h-48 animate-pulse rounded-2xl bg-stone-200 dark:bg-stone-700" /></div>}>
        <DishesList />
      </Suspense>
    </section>
  );
}
