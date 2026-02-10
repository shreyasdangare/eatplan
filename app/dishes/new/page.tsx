 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../../components/IngredientAutocompleteInput";

type Ingredient = {
  id: string;
  name: string;
  category?: string | null;
};

export default function NewDishPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<string>("both");
  const [prepTime, setPrepTime] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<
    {
      ingredient_id: string;
      quantity: string;
      is_optional: boolean;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);

  const ingredientOptions: IngredientOption[] = useMemo(
    () => ingredients.map((ing) => ({ id: ing.id, name: ing.name })),
    [ingredients]
  );

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = (await res.json()) as Ingredient[];
        setIngredients(data);
      }
    })();
  }, []);

  const addIngredientToSelection = (id: string) => {
    setSelectedIngredients((prev) => {
      const exists = prev.some((p) => p.ingredient_id === id);
      if (exists) return prev;
      return [
        ...prev,
        { ingredient_id: id, quantity: "", is_optional: false }
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
      const { id } = (await res.json()) as { id: string };
      const ingredient: Ingredient = { id, name: trimmed };
      setIngredients((prev) =>
        [...prev, ingredient].sort((a, b) =>
          a.name.localeCompare(b.name)
        )
      );
      addIngredientToSelection(id);
      setNewIngredientName("");
    } finally {
      setAddingIngredient(false);
    }
  };

  const toggleIngredient = (id: string) => {
    setSelectedIngredients((prev) => {
      const existing = prev.find((p) => p.ingredient_id === id);
      if (existing) {
        return prev.filter((p) => p.ingredient_id !== id);
      }
      return [
        ...prev,
        { ingredient_id: id, quantity: "", is_optional: false }
      ];
    });
  };

  const updateIngredient = (
    id: string,
    field: "quantity" | "is_optional",
    value: string | boolean
  ) => {
    setSelectedIngredients((prev) =>
      prev.map((p) =>
        p.ingredient_id === id
          ? { ...p, [field]: value }
          : p
      )
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const body = {
      name,
      description: description || null,
      meal_type: mealType,
      prep_time_minutes: prepTime ? Number(prepTime) : null,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      ingredients: selectedIngredients
    };

    const res = await fetch("/api/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    setLoading(false);

    if (res.ok) {
      router.push("/");
    } else {
      alert("Failed to save dish");
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-base font-semibold tracking-tight text-amber-900">
        Add dish
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="space-y-1">
          <label className="text-xs font-medium text-amber-800">Name</label>
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
        <div className="space-y-2">
          <IngredientAutocompleteInput
            label="Ingredients"
            ingredients={ingredientOptions}
            value={newIngredientName}
            onChange={setNewIngredientName}
            onSelectExisting={(ingredient) => {
              addIngredientToSelection(ingredient.id);
            }}
            onCreateNew={(name) => {
              if (!addingIngredient) {
                handleAddIngredient(name);
              }
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
                const ing = ingredients.find(
                  (i) => i.id === sel.ingredient_id
                );
                if (!ing) return null;
                return (
                  <div
                    key={sel.ingredient_id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="w-28 truncate">{ing.name}</span>
                    <input
                      placeholder="Qty"
                      className="flex-1 rounded border border-orange-200 bg-white px-2 py-1 text-xs"
                      value={sel.quantity}
                      onChange={(e) =>
                        updateIngredient(
                          sel.ingredient_id,
                          "quantity",
                          e.target.value
                        )
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
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-lime-500 px-4 py-2 text-sm font-semibold text-lime-950 shadow-sm disabled:opacity-60 hover:bg-lime-400"
        >
          {loading ? "Saving…" : "Save dish"}
        </button>
      </form>
    </section>
  );
}

