import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSession } from "@/lib/supabaseServerClient";
import { DishesListWithFilter } from "../components/DishesListWithFilter";
import { RecipesSheetActions } from "../components/RecipesSheetActions";

async function DishesList() {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select("id, name, meal_type, tags, image_url")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error || !dishes) {
    const message = error?.message ?? "Unknown error";
    if (process.env.NODE_ENV === "development") {
      console.error("[recipes] Supabase dishes error:", error);
    }
    return (
      <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800">
        <p className="font-medium">Failed to load dishes. Please try again.</p>
        {process.env.NODE_ENV === "development" && (
          <p className="font-mono text-xs text-red-600">{message}</p>
        )}
      </div>
    );
  }

  return <DishesListWithFilter dishes={dishes} />;
}

export default function RecipesPage() {
  return (
    <section className="space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            Recipes
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Your collection. Add from URL or screenshot, filter by tag or favorites.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <RecipesSheetActions />
          <Link
            href="/dishes/new"
            className="inline-flex shrink-0 min-h-[44px] items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 active:opacity-90"
          >
            <span aria-hidden>+</span> Add recipe
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><div className="h-48 animate-pulse rounded-2xl bg-stone-200" /><div className="h-48 animate-pulse rounded-2xl bg-stone-200" /><div className="h-48 animate-pulse rounded-2xl bg-stone-200" /></div>}>
        <DishesList />
      </Suspense>
    </section>
  );
}
