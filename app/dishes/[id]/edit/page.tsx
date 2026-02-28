"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../../../components/IngredientAutocompleteInput";

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
      <section className="space-y-4">
        <p className="text-sm text-stone-500">Loading recipe…</p>
      </section>
    );
  }

  if (error && !dish) {
    return (
      <section className="space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          href="/recipes"
          className="text-sm text-amber-600 hover:underline"
        >
          Back to recipes
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-amber-900">
          Edit recipe
        </h2>
        <Link
          href={`/dishes/${id}`}
          className="text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-amber-800">
            Name
          </label>
          <input
            required
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-amber-800">
            Description
          </label>
          <textarea
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-amber-800">
              Meal type
            </label>
            <select
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
            >
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="both">Both</option>
            </select>
          </div>
          <div className="space-y-1 w-28">
            <label className="text-xs font-medium text-amber-800">
              Prep time (min)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div className="space-y-1 w-24">
            <label className="text-xs font-medium text-amber-800">
              Servings
            </label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              placeholder="e.g. 2"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-amber-800">
            Tags (comma separated)
          </label>
          <input
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-amber-800">
            Steps
          </label>
          <textarea
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm shadow-sm"
            rows={6}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Cooking steps (e.g. 1. Mix... 2. Bake...)"
          />
        </div>
        <div className="space-y-2">
          <IngredientAutocompleteInput
            label="Ingredients"
            ingredients={ingredientOptions}
            value={newIngredientName}
            onChange={setNewIngredientName}
            onSelectExisting={(ingredient) =>
              addIngredientToSelection(ingredient.id)
            }
            onCreateNew={() => {
              if (!addingIngredient) handleAddIngredient(newIngredientName);
            }}
            disabled={addingIngredient}
          />
          <div className="flex flex-wrap gap-1.5">
            {ingredients.map((ing) => {
              const selected = selectedIngredients.some(
                (s) => s.ingredient_id === ing.id
              );
              return (
                <button
                  type="button"
                  key={ing.id}
                  onClick={() => toggleIngredient(ing.id)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    selected
                      ? "bg-lime-400 text-lime-950 shadow-sm"
                      : "bg-orange-100 text-orange-900"
                  }`}
                >
                  {ing.name}
                </button>
              );
            })}
          </div>
          {selectedIngredients.length > 0 && (
            <div className="space-y-2 rounded-lg border border-orange-200 bg-orange-50/80 p-2">
              {selectedIngredients.map((sel) => {
                const ing = ingredients.find((i) => i.id === sel.ingredient_id);
                if (!ing) return null;
                return (
                  <div
                    key={sel.ingredient_id}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span className="w-28 truncate">{ing.name}</span>
                    <input
                      placeholder="Qty (e.g. 2 cups)"
                      className="min-w-[80px] flex-1 rounded border border-orange-200 bg-white px-2 py-1 text-xs"
                      value={sel.quantity}
                      onChange={(e) =>
                        updateIngredient(
                          sel.ingredient_id,
                          "quantity",
                          e.target.value
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="Amt"
                      className="w-16 rounded border border-orange-200 bg-white px-2 py-1 text-xs"
                      value={sel.amount ?? ""}
                      onChange={(e) =>
                        updateIngredient(
                          sel.ingredient_id,
                          "amount",
                          e.target.value === ""
                            ? null
                            : Number(e.target.value)
                        )
                      }
                    />
                    <input
                      placeholder="Unit"
                      className="w-14 rounded border border-orange-200 bg-white px-2 py-1 text-xs"
                      value={sel.unit}
                      onChange={(e) =>
                        updateIngredient(sel.ingredient_id, "unit", e.target.value)
                      }
                    />
                    <label className="flex items-center gap-1 text-[11px] text-amber-800">
                      <input
                        type="checkbox"
                        checked={sel.is_optional}
                        onChange={(e) =>
                          updateIngredient(
                            sel.ingredient_id,
                            "is_optional",
                            e.target.checked
                          )
                        }
                      />
                      Optional
                    </label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-lime-950 shadow-sm disabled:opacity-60 hover:bg-lime-400"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
