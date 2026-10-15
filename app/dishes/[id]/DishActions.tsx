"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarPlus, ChefHat, Pencil, ShoppingCart } from "lucide-react";
import { AddToPlanSheet } from "@/app/components/AddToPlanSheet";
import { FavoriteButton } from "@/app/components/FavoriteButton";
import { toast } from "@/app/components/ui/Toast";
import { DeleteDishButton } from "./DeleteDishButton";

type Ing = { ingredient_id: string; quantity?: string | null; amount?: number | null; unit?: string | null };

export function DishActions({
  dish,
  ingredients,
  hasInstructions,
}: {
  dish: { id: string; name: string; meal_type?: string | null };
  ingredients: Ing[];
  hasInstructions: boolean;
}) {
  const [planOpen, setPlanOpen] = useState(false);
  const [adding, setAdding] = useState(false);

  const addToList = async () => {
    if (!ingredients.length) return;
    setAdding(true);
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: ingredients.map((di) => ({
            ingredient_id: di.ingredient_id,
            quantity: di.amount != null && di.unit ? `${di.amount} ${di.unit}` : di.quantity ?? null,
            source: "manual",
          })),
        }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { items?: { id: string }[] };
      const ids = (data.items ?? []).map((i) => i.id);
      toast({
        message: `Added ${ids.length} ingredient${ids.length === 1 ? "" : "s"} to your list`,
        action: {
          label: "Undo",
          onClick: () => {
            void Promise.all(ids.map((id) => fetch(`/api/shopping-list/${id}`, { method: "DELETE" })));
          },
        },
      });
    } catch {
      toast({ message: "Couldn't add to list. Try again.", tone: "error" });
    } finally {
      setAdding(false);
    }
  };

  const secondary =
    "flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-stone-200 bg-white/60 px-4 text-sm font-semibold text-stone-800 transition active:scale-95 hover:bg-stone-50 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-100 dark:hover:bg-stone-800";

  return (
    <div className="flex w-full flex-col gap-3 xl:w-[300px]">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-full bg-orange-600 px-6 text-base font-bold text-white shadow-lg transition-all hover:bg-orange-700 active:scale-95"
        >
          <CalendarPlus className="h-5 w-5" aria-hidden />
          Add to plan
        </button>
        <FavoriteButton dishId={dish.id} />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={addToList} disabled={adding || !ingredients.length} className={secondary}>
          <ShoppingCart className="h-4 w-4" aria-hidden />
          {adding ? "Adding…" : "Add to list"}
        </button>
        <Link
          href={`/dishes/${dish.id}/cook`}
          className={`${secondary} ${hasInstructions ? "" : "pointer-events-none opacity-60"}`}
          aria-disabled={!hasInstructions}
        >
          <ChefHat className="h-4 w-4" aria-hidden />
          Cook
        </Link>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Link
          href={`/dishes/${dish.id}/edit`}
          className="flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Edit
        </Link>
        <DeleteDishButton id={dish.id} />
      </div>
      <AddToPlanSheet dish={dish} open={planOpen} onClose={() => setPlanOpen(false)} />
    </div>
  );
}
