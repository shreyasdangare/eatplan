"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../../../components/IngredientAutocompleteInput";
import { ChevronLeft, Save, ChefHat, Clock, Users, Tags, Pencil } from "lucide-react";

type Ingredient = {
  id: string;
  name: string;
  category?: string | null;
};

type DishIngredient = {
  id: string;
  ingredient_id: string;
  quantity: string | null;
  amount: number | null;
  unit: string | null;
  is_optional: boolean;
  ingredients?: { id: string; name: string } | null;
};

type Dish = {
  id: string;
  name: string;
  description: string | null;
  meal_type: string | null;
  prep_time_minutes: number | null;
  tags: string[] | null;
  servings: number | null;
  instructions: string | null;
  image_url?: string | null;
  dish_ingredients?: DishIngredient[] | null;
};

export default function EditDishPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [dish, setDish] = useState<Dish | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<string>("both");
  const [prepTime, setPrepTime] = useState<string>("");
  const [tags, setTags] = useState("");
  const [servings, setServings] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<
    {
      ingredient_id: string;
      quantity: string;
      amount: number | null;
      unit: string;
      is_optional: boolean;
    }[]
  >([]);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);

  const ingredientOptions: IngredientOption[] = useMemo(
    () => ingredients.map((ing) => ({ id: ing.id, name: ing.name })),
    [ingredients]
  );

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dishRes, ingRes] = await Promise.all([
          fetch(`/api/dishes/${id}`),
          fetch("/api/ingredients")
        ]);
        if (!dishRes.ok) {
          setError("Failed to load recipe");
          return;
        }
        const dishData = (await dishRes.json()) as Dish;
        setDish(dishData);
        setName(dishData.name ?? "");
        setDescription(dishData.description ?? "");
        setMealType(dishData.meal_type ?? "both");
        setPrepTime(
          dishData.prep_time_minutes != null ? String(dishData.prep_time_minutes) : ""
        );
        setTags((dishData.tags ?? []).join(", "));
        setServings(
          dishData.servings != null ? String(dishData.servings) : ""
        );
        setInstructions(dishData.instructions ?? "");
        setSelectedIngredients(
          (dishData.dish_ingredients ?? []).map((di) => ({
            ingredient_id: di.ingredient_id,
            quantity: di.quantity ?? "",
            amount: di.amount ?? null,
            unit: di.unit ?? "",
            is_optional: di.is_optional ?? false
          }))
        );

        if (ingRes.ok) {
          const ingData = (await ingRes.json()) as Ingredient[];
          setIngredients(ingData);
          const existingIds = new Set(ingData.map((i) => i.id));
          const fromDish = (dishData.dish_ingredients ?? [])
            .map((di) =>
              di.ingredients
                ? { id: di.ingredients.id, name: di.ingredients.name }
                : null
            )
            .filter(Boolean) as Ingredient[];
          const missing = fromDish.filter((ing) => !existingIds.has(ing.id));
          if (missing.length > 0) {
            setIngredients((prev) =>
              [...prev, ...missing].sort((a, b) => a.name.localeCompare(b.name))
            );
          }
        }
      } catch {
        setError("Failed to load recipe");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const addIngredientToSelection = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      if (prev.some((p) => p.ingredient_id === ingredientId)) return prev;
      return [
        ...prev,
        {
          ingredient_id: ingredientId,
          quantity: "",
          amount: null,
          unit: "",
          is_optional: false
        }
      ];
    });
  };

  const handleAddIngredient = async (nameToCreate: string) => {
    const trimmed = nameToCreate.trim();
    if (!trimmed) return;
    setAddingIngredient(true);
    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed })
      });
      if (!res.ok) {
        alert("Failed to add ingredient");
        return;
      }
      const { id: newId } = (await res.json()) as { id: string };
      const ingredient: Ingredient = { id: newId, name: trimmed };
      setIngredients((prev) =>
        [...prev, ingredient].sort((a, b) => a.name.localeCompare(b.name))
      );
      addIngredientToSelection(newId);
      setNewIngredientName("");
    } finally {
      setAddingIngredient(false);
    }
  };

  const toggleIngredient = (ingredientId: string) => {
    setSelectedIngredients((prev) => {
      const existing = prev.find((p) => p.ingredient_id === ingredientId);
      if (existing) {
        return prev.filter((p) => p.ingredient_id !== ingredientId);
      }
      return [
        ...prev,
        {
          ingredient_id: ingredientId,
          quantity: "",
          amount: null,
          unit: "",
          is_optional: false
        }
      ];
    });
  };

  const updateIngredient = (
    ingredientId: string,
    field: "quantity" | "amount" | "unit" | "is_optional",
    value: string | number | null | boolean
  ) => {
    setSelectedIngredients((prev) =>
      prev.map((p) =>
        p.ingredient_id === ingredientId ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/dishes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          meal_type: mealType,
          prep_time_minutes: prepTime ? Number(prepTime) : null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          servings: servings ? Number(servings) : null,
          instructions: instructions.trim() || null,
          ingredients: selectedIngredients.map((s) => ({
            ingredient_id: s.ingredient_id,
            quantity: s.quantity || null,
            amount: s.amount ?? null,
            unit: s.unit || null,
            is_optional: s.is_optional
          }))
        })
      });
      if (res.ok) {
        router.push(`/dishes/${id}`);
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string })?.error ?? "Failed to save");
      }
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
        <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Loading recipe…</p>
      </section>
    );
  }

  if (error && !dish) {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
        <div className="rounded-2xl bg-red-50 p-6 text-center border border-red-100 dark:bg-red-950/30 dark:border-red-900/50">
           <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-4">{error}</p>
           <Link
             href="/recipes"
             className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
           >
             <ChevronLeft className="h-4 w-4" /> Back to recipes
           </Link>
        </div>
      </section>
    );
  }

  const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-stone-50/50 px-4 py-3 text-sm text-stone-900 shadow-sm transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/80 dark:bg-stone-900/50 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:bg-stone-800";
  const labelClasses = "mb-1.5 block text-sm font-bold text-stone-700 dark:text-stone-300";

  return (
    <section className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <Pencil className="h-6 w-6" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
              Edit recipe
            </h1>
            <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
              Refine your dish and perfect the details.
            </p>
          </div>
        </div>
        <Link
          href={`/dishes/${id}`}
          className="flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/50 px-4 py-2 text-sm font-bold text-stone-600 shadow-sm transition-all hover:bg-stone-50 dark:border-stone-700/80 dark:bg-stone-800/50 dark:text-stone-300 dark:hover:bg-stone-800"
        >
           Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 rounded-[2rem] glass-panel p-6 sm:p-8">
        
        {/* Basic Info */}
        <div className="space-y-5">
          <div>
            <label className={labelClasses}>Recipe Name</label>
            <input
              required
              placeholder="e.g. Nonna's Spaghetti Bolognese"
              className={inputClasses}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClasses}>
              Description <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              placeholder="A brief summary of this delicious dish..."
              className={`${inputClasses} resize-none`}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className={`${labelClasses} flex items-center gap-2`}>
              <ChefHat className="h-4 w-4 text-stone-400" /> Meal Type
            </label>
            <select
              className={inputClasses}
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div>
            <label className={`${labelClasses} flex items-center gap-2`}>
              <Clock className="h-4 w-4 text-stone-400" /> Prep Time
            </label>
            <div className="relative">
              <input
                type="number"
                min={0}
                placeholder="45"
                className={inputClasses}
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-400">min</span>
            </div>
          </div>
          <div>
            <label className={`${labelClasses} flex items-center gap-2`}>
              <Users className="h-4 w-4 text-stone-400" /> Servings
            </label>
            <input
              type="number"
              min={1}
              placeholder="4"
              className={inputClasses}
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        <div>
           <label className={`${labelClasses} flex items-center gap-2`}>
            <Tags className="h-4 w-4 text-stone-400" /> Tags
          </label>
          <input
            placeholder="e.g. spicy, vegan, quick (comma separated)"
            className={inputClasses}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div>
           <label className={labelClasses}>Instructions</label>
            <textarea
              className={`${inputClasses} font-mono text-xs sm:text-sm`}
              rows={8}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Cooking steps (e.g. 1. Mix... 2. Bake...)"
            />
        </div>

        <div className="h-px w-full bg-stone-200 dark:bg-stone-700" />

        {/* Ingredients Builder */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl bg-stone-50/50 p-5 dark:bg-stone-900/50 border border-stone-200/50 dark:border-stone-700/50">
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
               Build Ingredient List
            </h3>
            <div className="max-w-md">
              <IngredientAutocompleteInput
                label=""
                ingredients={ingredientOptions}
                value={newIngredientName}
                onChange={setNewIngredientName}
                onSelectExisting={(ingredient) => {
                  addIngredientToSelection(ingredient.id);
                }}
                onCreateNew={() => {
                  if (!addingIngredient) {
                    handleAddIngredient(newIngredientName);
                  }
                }}
                disabled={addingIngredient}
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {ingredients.map((ing) => {
                const selected = selectedIngredients.some(
                  (s) => s.ingredient_id === ing.id
                );
                return (
                  <button
                    type="button"
                    key={ing.id}
                    onClick={() => toggleIngredient(ing.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 border ${
                      selected
                        ? "bg-emerald-500 text-white border-emerald-600 shadow-sm dark:bg-emerald-600 dark:border-emerald-500"
                        : "bg-white text-stone-600 hover:bg-stone-100 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-700"
                    }`}
                  >
                    {ing.name}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedIngredients.length > 0 && (
             <div className="space-y-3">
              <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-2">
                Selected Ingredients Details
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {selectedIngredients.map((sel) => {
                  const ing = ingredients.find((i) => i.id === sel.ingredient_id);
                  if (!ing) return null;
                  return (
                    <div
                      key={sel.ingredient_id}
                      className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-sm transition-all hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-500"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-800 dark:text-stone-100 truncate">
                          {ing.name}
                        </span>
                        <label className="flex items-center gap-2 text-xs font-medium text-stone-500 cursor-pointer hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
                          <input
                            type="checkbox"
                            checked={sel.is_optional}
                            onChange={(e) =>
                              updateIngredient(sel.ingredient_id, "is_optional", e.target.checked)
                            }
                            className="rounded border-stone-300 text-orange-500 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-700"
                          />
                          Optional
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                         <input
                          placeholder="Display Text (e.g. '2 cups diced')"
                          className="w-full sm:flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-orange-500 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
                          value={sel.quantity}
                          onChange={(e) =>
                            updateIngredient(sel.ingredient_id, "quantity", e.target.value)
                          }
                        />
                         <div className="flex items-center gap-2 w-full sm:w-auto">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Amt"
                              className="w-20 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-orange-500 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
                              value={sel.amount ?? ""}
                              onChange={(e) =>
                                updateIngredient(
                                  sel.ingredient_id,
                                  "amount",
                                  e.target.value === "" ? null : Number(e.target.value)
                                )
                              }
                            />
                            <input
                              placeholder="Unit"
                              className="w-24 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs focus:border-orange-500 focus:bg-white focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
                              value={sel.unit}
                              onChange={(e) => updateIngredient(sel.ingredient_id, "unit", e.target.value)}
                            />
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <p className="rounded-lg bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-950/30 dark:text-red-400">
             {error}
          </p>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="group flex w-full items-center justify-center gap-2 rounded-full mb-8 bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-orange-500 hover:shadow-2xl active:scale-95 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
          >
            {saving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <Save className="h-5 w-5 transition-transform group-hover:scale-110" />
            )}
            <span>{saving ? "Saving Changes…" : "Save Changes"}</span>
          </button>
        </div>
      </form>
    </section>
  );
}
