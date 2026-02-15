import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { FavoriteButton } from "../../components/FavoriteButton";
import { DeleteDishButton } from "./DeleteDishButton";
import { DishImageUpload } from "./DishImageUpload";
import { PortionScaling } from "./PortionScaling";

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
    <article className="pb-12">
      {/* Hero */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-10">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-200 dark:bg-stone-700 sm:aspect-[21/9]">
          <DishImageUpload
            dishId={dish.id as string}
            imageUrl={imageUrl}
            variant="hero"
          />
        </div>
        <div className="px-4 sm:px-6 lg:px-10">
          <div className="relative -mt-16 rounded-t-2xl border border-b-0 border-stone-200 bg-white px-5 pb-6 pt-6 dark:border-stone-700 dark:bg-stone-900 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 sm:text-3xl">
                  {dish.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-stone-500 dark:text-stone-400">
                  {dish.meal_type && (
                    <span className="uppercase tracking-wide">{dish.meal_type}</span>
                  )}
                  {dish.prep_time_minutes != null && (
                    <span>{dish.prep_time_minutes} min prep</span>
                  )}
                  {servings != null && servings > 0 && (
                    <span>Serves {servings}</span>
                  )}
                </div>
                {dish.tags && dish.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {dish.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-lg bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-700 dark:text-stone-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FavoriteButton dishId={dish.id as string} />
                <Link
                  href={`/dishes/${dish.id}/edit`}
                  className="inline-flex items-center rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Edit recipe
                </Link>
                <Link
                  href={`/dishes/${dish.id}/cook`}
                  className="inline-flex items-center rounded-xl bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  Cooking mode
                </Link>
                <Link
                  href="/recipes"
                  className="inline-flex items-center rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Back
                </Link>
                <DeleteDishButton id={dish.id as string} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-0 space-y-6 border border-t-0 border-stone-200 bg-white px-4 pb-8 dark:border-stone-700 dark:bg-stone-900 sm:px-6 lg:px-10">
        {dish.description && (
          <p className="pt-6 text-stone-600 dark:text-stone-400">
            {dish.description}
          </p>
        )}

        <PortionScaling
          baseServings={servings ?? null}
          required={required ?? []}
          optional={optional ?? []}
        />

        {instructions && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Steps
            </h2>
            <div className="whitespace-pre-line rounded-xl border border-stone-200 bg-stone-50/80 p-4 text-stone-800 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200">
              {instructions}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}

