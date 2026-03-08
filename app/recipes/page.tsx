import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSession } from "@/lib/supabaseServerClient";
import { DishesListWithFilter } from "../components/DishesListWithFilter";
import { RecipesSheetActions } from "../components/RecipesSheetActions";
import { Plus } from "lucide-react";

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
      <div className="space-y-2 rounded-[2rem] border border-red-200 bg-red-50/80 p-6 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
        <p className="font-semibold text-base">Failed to load dishes. Please try again.</p>
        {process.env.NODE_ENV === "development" && (
          <p className="font-mono text-xs text-red-600 dark:text-red-400">{message}</p>
        )}
      </div>
    );
  }

  return <DishesListWithFilter dishes={dishes} />;
}

export default function RecipesPage() {
  return (
    <section className="space-y-8 lg:space-y-10 pb-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            Recipes
          </h1>
          <p className="mt-2 text-base font-medium text-stone-500 dark:text-stone-400 max-w-lg">
            Your collection. Add from URL or screenshot, filter by tag or favorites.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RecipesSheetActions />
          <Link
            href="/dishes/new"
            className="group inline-flex shrink-0 min-h-[48px] items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black hover:shadow-xl hover:-translate-y-0.5 active:scale-95 dark:bg-orange-500 dark:hover:bg-orange-400"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" aria-hidden />
            <span>Add recipe</span>
          </Link>
        </div>
      </div>
      
      <Suspense fallback={
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-stone-200/50 dark:bg-stone-800/50" />
          <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-stone-200/50 dark:bg-stone-800/50 hidden sm:block" />
          <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-stone-200/50 dark:bg-stone-800/50 hidden lg:block" />
        </div>
      }>
        <DishesList />
      </Suspense>
    </section>
  );
}
