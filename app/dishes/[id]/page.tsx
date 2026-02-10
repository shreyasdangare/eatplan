import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import { DeleteDishButton } from "./DeleteDishButton";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DishDetailPage({ params }: PageProps) {
  const { id } = await params;

  const { data: dish, error } = await supabaseServer
    .from("dishes")
    .select(
      "id, name, description, meal_type, prep_time_minutes, tags, dish_ingredients(id, ingredient_id, quantity, is_optional, ingredients(name))"
    )
    .eq("id", id)
    .single();

  if (error || !dish) {
    if (error?.code === "PGRST116") {
      notFound();
    }
    console.error("Error loading dish detail", error);
    notFound();
  }

  const required = (dish as any).dish_ingredients?.filter(
    (di: any) => !di.is_optional
  );
  const optional = (dish as any).dish_ingredients?.filter(
    (di: any) => di.is_optional
  );

  return (
    <section className="space-y-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            {dish.name}
          </h2>
          {dish.meal_type && (
            <p className="text-[11px] uppercase tracking-wide text-amber-700">
              {dish.meal_type}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DeleteDishButton id={dish.id as string} />
          <Link
            href="/"
            className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
          >
            Back
          </Link>
        </div>
      </div>

      {dish.description && (
        <p className="text-sm text-stone-800">{dish.description}</p>
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

      <div className="space-y-3">
        {required && required.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-amber-800">
              Required ingredients
            </h3>
            <ul className="space-y-1">
              {required.map((di: any) => (
                <li key={di.id} className="flex justify-between gap-2">
                  <span>{di.ingredients?.name ?? "Unknown ingredient"}</span>
                  {di.quantity && (
                    <span className="text-xs text-amber-700">
                      {di.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {optional && optional.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-amber-800">
              Optional ingredients
            </h3>
            <ul className="space-y-1">
              {optional.map((di: any) => (
                <li key={di.id} className="flex justify-between gap-2">
                  <span>{di.ingredients?.name ?? "Unknown ingredient"}</span>
                  {di.quantity && (
                    <span className="text-xs text-amber-700">
                      {di.quantity}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

