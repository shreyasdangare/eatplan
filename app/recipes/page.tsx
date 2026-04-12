import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { getSession } from "@/lib/supabaseServerClient";
import { DishesListWithFilter } from "../components/DishesListWithFilter";
import { RecipesSheetActions } from "../components/RecipesSheetActions";
import { AddRecipeDropdown } from "../components/AddRecipeDropdown";

async function DishesList() {
  const { user } = await getSession();
  if (!user) redirect("/login");

  const { getHouseholdId } = await import("@/lib/getHouseholdId");
  const householdId = await getHouseholdId(user.id);
  if (!householdId) {
    return <div>Failed to load household context.</div>;
  }

  const { data: dishes, error } = await supabaseServer
    .from("dishes")
    .select("id, name, meal_type, tags, image_url")
    .eq("household_id", householdId)
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

  const defaultVegOnly = user.user_metadata?.isVegetarianOnly === true;

  return (
    <DishesListWithFilter dishes={dishes} defaultVegOnly={defaultVegOnly}>
      <div className="flex flex-wrap items-center gap-3">
        <RecipesSheetActions />
        <AddRecipeDropdown />
      </div>
    </DishesListWithFilter>
  );
}

export default function RecipesPage() {
  return (
    <section className="space-y-8 lg:space-y-10 pb-12 pt-4">
      
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
