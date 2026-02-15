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

  return (
    <section className="space-y-5 text-sm lg:space-y-6 lg:text-base">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-amber-900 dark:text-amber-200 lg:text-xl">
            {dish.name}
          </h2>
          {dish.meal_type && (
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {dish.meal_type}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton dishId={dish.id as string} />
          <Link
            href={`/dishes/${dish.id}/cook`}
            className="rounded-full bg-lime-500 px-3 py-1.5 text-xs font-semibold text-lime-950 shadow-sm hover:bg-lime-400"
          >
            Cooking mode
          </Link>
          <DeleteDishButton id={dish.id as string} />
          <Link
            href="/recipes"
            className="rounded-full bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
          >
            Back
          </Link>
        </div>
      </div>

      <DishImageUpload
        dishId={dish.id as string}
        imageUrl={(dish as any).image_url ?? null}
      />

      {dish.description && (
        <p className="text-sm text-stone-800">{dish.description}</p>
      )}

      {(dish as { instructions?: string | null }).instructions && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
            Steps
          </h3>
          <div className="whitespace-pre-line rounded-lg border border-orange-200 bg-orange-50/50 p-3 text-sm text-stone-800 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-200">
            {(dish as { instructions: string }).instructions}
          </div>
        </div>
      )}

      {dish.prep_time_minutes != null && (
        <p className="text-xs text-amber-700">
          Prep time: {dish.prep_time_minutes} min
        </p>
      )}

      {dish.tags && dish.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {dish.tags.map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] text-orange-900"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <PortionScaling
        baseServings={(dish as any).servings ?? null}
        required={required ?? []}
        optional={optional ?? []}
      />
    </section>
  );
}

