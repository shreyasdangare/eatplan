import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { FavoriteButton } from "../../components/FavoriteButton";
import { DeleteDishButton } from "./DeleteDishButton";
import { DishImageUpload } from "./DishImageUpload";
import { PortionScaling } from "./PortionScaling";
import { MissingIngredients } from "./MissingIngredients";
import { ChefHat, ChevronLeft, Clock, Pencil, Trash2, Utensils } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

const DISH_SELECT_FULL =
  "id, name, description, meal_type, prep_time_minutes, tags, image_url, servings, instructions, dish_ingredients(id, ingredient_id, quantity, amount, unit, is_optional, ingredients(name))";
const DISH_SELECT_LEGACY =
  "id, name, description, meal_type, prep_time_minutes, tags, dish_ingredients(id, ingredient_id, quantity, is_optional, ingredients(name))";

export default async function DishDetailPage({ params }: PageProps) {
  const { id } = await params;

  let result = await supabaseServer
    .from("dishes")
    .select(DISH_SELECT_FULL)
    .eq("id", id)
    .single();

  if (result.error && result.error.code !== "PGRST116") {
    const msg = result.error.message ?? "";
    const maybeMissingColumn =
      msg.includes("column") && (msg.includes("does not exist") || msg.includes("undefined"));
    if (maybeMissingColumn) {
      result = await supabaseServer
        .from("dishes")
        .select(DISH_SELECT_LEGACY)
        .eq("id", id)
        .single();
    }
  }

  const { data: dish, error } = result;

  if (error || !dish) {
    if (error?.code === "PGRST116") {
      notFound();
    }
    console.error(
      "Error loading dish detail",
      error?.message ?? error?.code ?? error,
      error
    );
    notFound();
  }

  const required = (dish as any).dish_ingredients?.filter(
    (di: any) => !di.is_optional
  );
  const optional = (dish as any).dish_ingredients?.filter(
    (di: any) => di.is_optional
  );

  const imageUrl = (dish as { image_url?: string | null }).image_url ?? null;
  const instructions = (dish as { instructions?: string | null }).instructions;
  const servings = (dish as { servings?: number | null }).servings;

  return (
    <article className="pb-16 max-w-5xl mx-auto">
      {/* Top Nav Overlay (Back Button) */}
      <div className="absolute top-4 left-4 z-50 sm:top-6 sm:left-6">
         <Link
            href="/recipes"
            className="group flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/20 backdrop-blur-md border border-white/20 text-white shadow-lg transition-all hover:bg-black/40 hover:scale-105 active:scale-95"
            aria-label="Back to recipes"
          >
            <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 transition-transform group-hover:-translate-x-1" />
          </Link>
      </div>

      {/* Hero – content scrolls over this */}
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-200 dark:bg-stone-800 sm:aspect-[21/9]">
          <DishImageUpload
            dishId={dish.id as string}
            imageUrl={imageUrl}
            variant="hero"
          />
          {/* Subtle gradient overlay for the overlapping header */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" aria-hidden />
        </div>
        
        {/* Overlapping Header Card */}
        <div className="px-4 sm:px-8 lg:px-12 relative z-10 -mt-20 sm:-mt-28">
          <div className="flex flex-col gap-6 rounded-[2rem] glass-panel p-6 sm:p-8 shadow-2xl xl:flex-row xl:items-start xl:justify-between border border-white/40 dark:border-stone-700/50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                 {dish.meal_type && (
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                    {dish.meal_type}
                  </span>
                 )}
                 {dish.tags && dish.tags.length > 0 && dish.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border border-stone-200/50 bg-white/50 px-3 py-1 text-xs font-semibold text-stone-600 dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-300 backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl mb-4 leading-tight">
                {dish.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-sm font-semibold text-stone-600 dark:text-stone-400">
                {dish.prep_time_minutes != null && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                    <span>{dish.prep_time_minutes} min prep</span>
                  </div>
                )}
                {servings != null && servings > 0 && (
                  <div className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-stone-400 dark:text-stone-500" />
                    <span>Serves {servings}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 xl:flex-col xl:items-end xl:w-[280px]">
              <FavoriteButton dishId={dish.id as string} />
              
              <Link
                href={`/dishes/${dish.id}/cook`}
                className="group flex flex-1 xl:w-full min-h-[56px] items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-base font-bold text-white shadow-lg transition-all hover:bg-black hover:shadow-xl hover:-translate-y-0.5 active:scale-95 dark:bg-orange-500 dark:hover:bg-orange-400"
              >
                <ChefHat className="h-5 w-5 transition-transform group-hover:scale-110" />
                <span>Start Cooking</span>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">Soon</span>
              </Link>
              
              <div className="flex w-full xl:w-auto items-center gap-3">
                <Link
                  href={`/dishes/${dish.id}/edit`}
                  className="flex flex-1 xl:w-auto min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-stone-200/50 bg-white/50 px-5 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 hover:border-stone-300 active:scale-95 dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-200 dark:hover:border-stone-600 dark:hover:bg-stone-800"
                >
                  <Pencil className="h-4 w-4" />
                  <span>Edit</span>
                </Link>
                <div className="shrink-0 flex items-center justify-center rounded-full bg-white/50 p-2 shadow-sm border border-stone-200/50 dark:bg-stone-800/50 dark:border-stone-700/50">
                  <DeleteDishButton id={dish.id as string} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-8 sm:mt-12 space-y-12 px-2 sm:px-4">
        {dish.description && (
          <div className="max-w-3xl">
            <h2 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 mb-4">
              About this recipe
            </h2>
            <p className="text-lg leading-relaxed text-stone-700 dark:text-stone-300">
              {dish.description}
            </p>
          </div>
        )}

        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="sticky top-24">
              <PortionScaling
                baseServings={servings ?? null}
                required={required ?? []}
                optional={optional ?? []}
              />
              <MissingIngredients
                dishIngredients={[
                  ...(required ?? []).map((di: any) => ({
                    ingredient_id: di.ingredient_id,
                    ingredients: di.ingredients,
                    quantity: di.quantity,
                    amount: di.amount,
                    unit: di.unit,
                  })),
                  ...(optional ?? []).map((di: any) => ({
                    ingredient_id: di.ingredient_id,
                    ingredients: di.ingredients,
                    quantity: di.quantity,
                    amount: di.amount,
                    unit: di.unit,
                  })),
                ]}
              />
            </div>
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            {instructions ? (
              <section>
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                    Instructions
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent dark:from-stone-700" />
                </div>
                <div className="prose prose-stone dark:prose-invert prose-lg max-w-none text-stone-700 dark:text-stone-300 leading-relaxed font-medium">
                   {/* Here we might assume instructions could be markdown later, but for now we just render pre-line text nicely */}
                  <div className="whitespace-pre-line rounded-[2rem] glass-panel p-6 sm:p-8 shadow-sm">
                    {instructions}
                  </div>
                </div>
              </section>
            ) : (
              <section>
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                    Instructions
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent dark:from-stone-700" />
                </div>
                <div className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/50 p-8 text-center dark:border-stone-700 dark:bg-stone-800/30">
                  <p className="text-stone-500 dark:text-stone-400 font-medium">No instructions provided.</p>
                  <Link href={`/dishes/${dish.id}/edit`} className="mt-2 inline-block font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                    Add instructions →
                  </Link>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

