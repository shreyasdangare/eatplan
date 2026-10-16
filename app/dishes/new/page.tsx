"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../../components/IngredientAutocompleteInput";
import { Link as LinkIcon, Camera, Plus, Save, ChefHat, Clock, Users, Tags, Wand2, PenLine, ChevronDown, ClipboardPaste } from "lucide-react";

type Ingredient = {
  id: string;
  name: string;
  category?: string | null;
};

export default function NewDishPage() {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<"magic" | "manual">("magic");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mealType, setMealType] = useState<string>("both");
  const [prepTime, setPrepTime] = useState<string>("");
  const [tags, setTags] = useState<string>("");
  const [servings, setServings] = useState<string>("");
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
  const [loading, setLoading] = useState(false);
  const [smartValue, setSmartValue] = useState("");
  const [canPaste, setCanPaste] = useState(false);
  const [importingType, setImportingType] = useState<null | "name" | "url" | "screenshot">(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [addingIngredient, setAddingIngredient] = useState(false);

  const ingredientOptions: IngredientOption[] = useMemo(
    () => ingredients.map((ing) => ({ id: ing.id, name: ing.name })),
    [ingredients]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "manual") {
      setExpandedSection("manual");
    }
    // Web Share Target / deep link: /dishes/new?url=… (or text=… containing a link)
    const shared = params.get("url") || params.get("text") || params.get("title");
    if (shared) {
      const link = shared.match(/https?:\/\/\S+/)?.[0];
      setSmartValue(link ?? shared);
    }
    setCanPaste(typeof navigator !== "undefined" && !!navigator.clipboard?.readText);
    
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
        { ingredient_id: id, quantity: "", amount: null, unit: "", is_optional: false }
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
        { ingredient_id: id, quantity: "", amount: null, unit: "", is_optional: false }
      ];
    });
  };

  const updateIngredient = (
    id: string,
    field: "quantity" | "amount" | "unit" | "is_optional",
    value: string | number | null | boolean
  ) => {
    setSelectedIngredients((prev) =>
      prev.map((p) =>
        p.ingredient_id === id
          ? { ...p, [field]: value }
          : p
      )
    );
  };

  const smartIsUrl = /^(https?:\/\/|www\.)\S+$/i.test(smartValue.trim()) || /^\S+\.[a-z]{2,}\/\S*$/i.test(smartValue.trim());

  const handleSmartImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = smartValue.trim();
    if (!v) return;
    if (smartIsUrl) await importFromUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    else await importByName(v);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (text) setSmartValue(text);
    } catch {
      setCanPaste(false);
    }
  };

  const importFromUrl = async (url: string) => {
    if (!url) return;
    setImportError(null);
    setImportingType("url");
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    setImportingType(null);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      router.push(`/dishes/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError((data as { error?: string })?.error ?? "Import failed");
    }
  };

  const importScreenshotFile = async (file: File) => {
    setImportError(null);
    setImportingType("screenshot");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      body: formData
    });
    setImportingType(null);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      router.push(`/dishes/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError((data as { error?: string })?.error ?? "Import failed");
    }
  };

  const importByName = async (nameToImport: string) => {
    if (!nameToImport) return;
    setImportError(null);
    setImportingType("name");
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeName: nameToImport })
    });
    setImportingType(null);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      router.push(`/dishes/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError((data as { error?: string })?.error ?? "Generation failed");
    }
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
      servings: servings ? Number(servings) : null,
      ingredients: selectedIngredients.map((s) => ({
        ingredient_id: s.ingredient_id,
        quantity: s.quantity || null,
        amount: s.amount ?? null,
        unit: s.unit || null,
        is_optional: s.is_optional
      }))
    };

    const res = await fetch("/api/dishes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    setLoading(false);

    if (res.ok) {
      router.push("/recipes");
    } else {
      alert("Failed to save dish");
    }
  };

  const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-stone-50/50 px-4 py-3 text-sm text-stone-900 shadow-xs transition-all focus:border-orange-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/80 dark:bg-stone-900/50 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:bg-stone-800";
  const labelClasses = "mb-1.5 block text-sm font-bold text-stone-700 dark:text-stone-300";

  return (
    <section className="mx-auto max-w-3xl space-y-8 pb-12">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-3xl">
            Add a new recipe
          </h1>
          <p className="mt-1 text-sm font-medium text-stone-500 dark:text-stone-400">
            Import from anywhere or enter details manually.
          </p>
        </div>
      </div>

      {/* Smart import: one field for links and dish names, one button for photos */}
      <div className={`relative overflow-hidden rounded-4xl glass-panel p-5 sm:p-8 ${expandedSection === "magic" ? "ring-2 ring-orange-500/50" : ""}`}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300">
            <Wand2 className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">Import magic</h2>
            <p className="text-sm text-stone-600 dark:text-stone-300">Paste a recipe or YouTube link, or just type a dish name.</p>
          </div>
        </div>
        <form onSubmit={handleSmartImport} className="space-y-3">
          <label htmlFor="smart-import" className="sr-only">
            Recipe link or dish name
          </label>
          <div className="relative">
            <input
              id="smart-import"
              type="text"
              inputMode={smartIsUrl ? "url" : "text"}
              autoCapitalize={smartIsUrl ? "none" : "sentences"}
              autoCorrect="off"
              autoComplete="off"
              enterKeyHint="go"
              placeholder="https://… or “Paneer butter masala”"
              className={`${inputClasses} min-h-12 pr-24 text-base`}
              value={smartValue}
              onChange={(e) => setSmartValue(e.target.value)}
              disabled={!!importingType}
            />
            {!smartValue && canPaste && (
              <button
                type="button"
                onClick={pasteFromClipboard}
                className="absolute right-1 top-1/2 flex min-h-10 -translate-y-1/2 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-stone-800"
              >
                <ClipboardPaste className="h-4 w-4" aria-hidden /> Paste
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!!importingType || !smartValue.trim()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-4 text-base font-bold text-white shadow-md transition-all hover:bg-orange-700 active:scale-[0.98] disabled:opacity-50"
          >
            {importingType === "url" || importingType === "name" ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden />
            ) : smartIsUrl ? (
              <LinkIcon className="h-5 w-5" aria-hidden />
            ) : (
              <Wand2 className="h-5 w-5" aria-hidden />
            )}
            {importingType === "url"
              ? "Reading the recipe…"
              : importingType === "name"
              ? "Writing the recipe…"
              : smartIsUrl
              ? "Import from link"
              : "Create recipe"}
          </button>
        </form>

        <div className="my-4 flex items-center gap-3" aria-hidden>
          <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          <span className="text-xs font-bold uppercase tracking-widest text-stone-600 dark:text-stone-300">or</span>
          <div className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>

        <label
          className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-stone-300 bg-white/70 px-4 text-base font-bold text-stone-800 transition-all active:scale-[0.98] dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-100 ${
            importingType ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {importingType === "screenshot" ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : (
            <Camera className="h-5 w-5" aria-hidden />
          )}
          {importingType === "screenshot" ? "Scanning photo…" : "Scan a photo or screenshot"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/heic"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void importScreenshotFile(f);
            }}
            disabled={!!importingType}
          />
        </label>

        {importingType && (
          <p className="mt-3 text-center text-sm text-stone-600 dark:text-stone-300" role="status">
            This usually takes 10–30 seconds. You can keep this screen open.
          </p>
        )}

        {importError && (
          <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div>
              <p className="font-bold">Import failed</p>
              <p className="mt-1">{importError}</p>
              <button type="button" onClick={() => setExpandedSection("manual")} className="mt-2 min-h-11 font-bold underline underline-offset-2">
                Enter it manually instead
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Accordion */}
      <div className={`overflow-hidden rounded-4xl glass-panel transition-all ${expandedSection === "manual" ? "ring-2 ring-orange-500/50" : "shadow-none border-stone-200/40"}`}>
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === "manual" ? "magic" : "manual")}
          aria-expanded={expandedSection === "manual"}
          className="flex w-full items-center justify-between p-6 sm:p-8 text-left"
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${expandedSection === "manual" ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" : "bg-stone-100 text-stone-500 dark:bg-stone-800/60 dark:text-stone-400"}`}>
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">Enter manually</h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">Fill out recipe details yourself</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-stone-500 dark:text-stone-400 transition-transform ${expandedSection === "manual" ? "rotate-180" : ""}`} />
        </button>

        {expandedSection === "manual" && (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 animate-in fade-in slide-in-from-top-4">
             <div className="h-px bg-stone-200/50 dark:bg-stone-700/50 mb-6 -mt-2" />
             <form onSubmit={handleSubmit} className="space-y-8">
               
               {/* Basic Info */}
               <div className="space-y-5">
                 <div>
                   <label className={labelClasses} htmlFor="dish-field-1">Recipe Name</label>
                   <input id="dish-field-1"
                     required
                     placeholder="e.g. Nonna's Spaghetti Bolognese"
                     className={inputClasses}
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                   />
                 </div>
                 <div>
                   <label className={labelClasses} htmlFor="dish-field-2">
                     Description <span className="text-stone-500 dark:text-stone-400 font-normal">(Optional)</span>
                   </label>
                   <textarea id="dish-field-2"
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
                   <label className={`${labelClasses} flex items-center gap-2`} htmlFor="dish-field-11">
                     <ChefHat className="h-4 w-4 text-stone-500 dark:text-stone-400" /> Meal Type
                   </label>
                   <select id="dish-field-11"
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
                   <label className={`${labelClasses} flex items-center gap-2`} htmlFor="dish-field-12">
                     <Clock className="h-4 w-4 text-stone-500 dark:text-stone-400" /> Prep Time
                   </label>
                   <div className="relative">
                     <input id="dish-field-12"
                       type="number"
                       inputMode="numeric"
                       min={0}
                       placeholder="45"
                       className={inputClasses}
                       value={prepTime}
                       onChange={(e) => setPrepTime(e.target.value)}
                     />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-stone-500 dark:text-stone-400">min</span>
                   </div>
                 </div>
                 <div>
                   <label className={`${labelClasses} flex items-center gap-2`} htmlFor="dish-field-13">
                     <Users className="h-4 w-4 text-stone-500 dark:text-stone-400" /> Servings
                   </label>
                   <input id="dish-field-13"
                     type="number"
                     inputMode="numeric"
                     min={1}
                     placeholder="4"
                     className={inputClasses}
                     value={servings}
                     onChange={(e) => setServings(e.target.value)}
                   />
                 </div>
               </div>

               <div>
                 <label className={`${labelClasses} flex items-center gap-2`} htmlFor="dish-field-14">
                   <Tags className="h-4 w-4 text-stone-500 dark:text-stone-400" /> Tags
                 </label>
                 <input id="dish-field-14"
                   placeholder="e.g. spicy, vegan, quick (comma separated)"
                   className={inputClasses}
                   value={tags}
                   onChange={(e) => setTags(e.target.value)}
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
                       label="Add an ingredient"
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
                   </div>

                   <div className="flex flex-wrap gap-2 pt-2" aria-label="Selected ingredients">
                     {selectedIngredients.length === 0 ? (
                       <p className="text-sm text-stone-600 dark:text-stone-300">Search above to add ingredients. Pick a suggestion or press Enter to create a new one.</p>
                     ) : (
                       selectedIngredients.map((sel) => {
                         const ing = ingredients.find((i) => i.id === sel.ingredient_id);
                         if (!ing) return null;
                         return (
                           <button
                             type="button"
                             key={ing.id}
                             onClick={() => toggleIngredient(ing.id)}
                             aria-label={`Remove ${ing.name}`}
                             className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-700 px-4 text-sm font-semibold text-white transition-all active:scale-95"
                           >
                             {ing.name}
                             <span aria-hidden className="text-base leading-none">×</span>
                           </button>
                         );
                       })
                     )}
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
                             className="group flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 shadow-xs transition-all hover:border-orange-300 dark:border-stone-700 dark:bg-stone-800 dark:hover:border-orange-500"
                           >
                             <div className="flex items-center justify-between">
                               <span className="font-bold text-stone-800 dark:text-stone-100 truncate">
                                 {ing.name}
                               </span>
                               <label className="-my-2 flex min-h-11 items-center gap-2 px-1 text-sm font-medium text-stone-600 cursor-pointer hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200">
                                 <input
                                   type="checkbox"
                                   checked={sel.is_optional}
                                   onChange={(e) =>
                                     updateIngredient(sel.ingredient_id, "is_optional", e.target.checked)
                                   }
                                   className="h-5 w-5 rounded-sm border-stone-300 text-orange-500 focus:ring-orange-500 dark:border-stone-600 dark:bg-stone-700"
                                 />
                                 Optional
                               </label>
                             </div>
                             <div className="flex flex-wrap items-center gap-2">
                                <input
                                 placeholder="Display Text (e.g. '2 cups diced')"
                                 className="w-full sm:flex-1 min-h-11 rounded-lg border border-stone-200 bg-stone-50 px-3 text-base sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
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
                                    inputMode="decimal"
                                     placeholder="Amt"
                                     className="w-20 min-h-11 rounded-lg border border-stone-200 bg-stone-50 px-3 text-base sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
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
                                     className="w-24 min-h-11 rounded-lg border border-stone-200 bg-stone-50 px-3 text-base sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:focus:border-orange-500"
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
               
               <div className="pt-4">
                 <button
                   type="submit"
                   disabled={loading}
                   className="group flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-orange-700 hover:shadow-2xl active:scale-95 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-700"
                 >
                   {loading ? (
                     <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                   ) : (
                     <Save className="h-5 w-5 transition-transform group-hover:scale-110" />
                   )}
                   <span>{loading ? "Saving Dish…" : "Save Dish"}</span>
                 </button>
               </div>
             </form>
          </div>
        )}
      </div>
    </section>
  );
}
