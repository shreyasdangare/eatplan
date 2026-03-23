"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IngredientAutocompleteInput,
  IngredientOption
} from "../../components/IngredientAutocompleteInput";
import { Link as LinkIcon, Camera, Plus, Save, ChefHat, Clock, Users, Tags, Wand2, PenLine, ChevronDown, Search } from "lucide-react";

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
  const [importUrl, setImportUrl] = useState("");
  const [importScreenshotFile, setImportScreenshotFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importName, setImportName] = useState("");
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

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = importUrl.trim();
    if (!url) return;
    setImportError(null);
    setImporting(true);
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });
    setImporting(false);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      router.push(`/dishes/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError((data as { error?: string })?.error ?? "Import failed");
    }
  };

  const handleImportScreenshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importScreenshotFile) return;
    setImportError(null);
    setImporting(true);
    const formData = new FormData();
    formData.append("file", importScreenshotFile);
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      body: formData
    });
    setImporting(false);
    if (res.ok) {
      const data = (await res.json()) as { id: string };
      router.push(`/dishes/${data.id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setImportError((data as { error?: string })?.error ?? "Import failed");
    }
  };

  const handleImportByName = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToImport = importName.trim();
    if (!nameToImport) return;
    setImportError(null);
    setImporting(true);
    const res = await fetch("/api/import-recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeName: nameToImport })
    });
    setImporting(false);
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

  const inputClasses = "w-full rounded-xl border border-stone-200/80 bg-stone-50/50 px-4 py-3 text-sm text-stone-900 shadow-sm transition-all focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/80 dark:bg-stone-900/50 dark:text-stone-100 dark:focus:border-orange-500 dark:focus:bg-stone-800";
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

      {/* Import Accordion */}
      <div className={`overflow-hidden rounded-[2rem] glass-panel transition-all ${expandedSection === "magic" ? "ring-2 ring-orange-500/50" : "opacity-80 hover:opacity-100 shadow-none border-stone-200/40"}`}>
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === "magic" ? "manual" : "magic")}
          className="flex w-full items-center justify-between p-6 sm:p-8 text-left"
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${expandedSection === "magic" ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" : "bg-stone-100 text-stone-500 dark:bg-stone-800/60 dark:text-stone-400"}`}>
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">Auto-Import Magic</h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">Extract from URL or screenshot</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-stone-400 transition-transform ${expandedSection === "magic" ? "rotate-180" : ""}`} />
        </button>
        
        {expandedSection === "magic" && (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 animate-in fade-in slide-in-from-top-4">
            <div className="h-px bg-stone-200/50 dark:bg-stone-700/50 mb-6 -mt-2" />
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              
              {/* Name Import */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <Search className="h-4 w-4 text-stone-400" />
                    From Name
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Type a dish to generate a highly-rated recipe for 2.
                  </p>
                </div>
                <form onSubmit={handleImportByName} className="space-y-3">
                  <input
                    type="text"
                    placeholder="e.g. Pasta Carbonara"
                    className={inputClasses}
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    disabled={importing}
                  />
                  <button
                    type="submit"
                    disabled={importing || !importName.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                  >
                     {importing ? "Generating…" : "Generate Recipe"}
                  </button>
                </form>
              </div>

              {/* URL Import */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-stone-400" />
                    From URL or YouTube
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Paste a link and we'll extract the recipe.
                  </p>
                </div>
                <form onSubmit={handleImport} className="space-y-3">
                  <input
                    type="url"
                    placeholder="https://..."
                    className={inputClasses}
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    disabled={importing}
                  />
                  <button
                    type="submit"
                    disabled={importing || !importUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                  >
                     {importing ? "Importing…" : "Extract Recipe"}
                  </button>
                </form>
              </div>

              {/* Screenshot Import */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                    <Camera className="h-4 w-4 text-stone-400" />
                    From Screenshot
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    Upload an image of a recipe page or cookbook.
                  </p>
                </div>
                <form onSubmit={handleImportScreenshot} className="space-y-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full rounded-xl border border-dashed border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-600 file:mr-4 file:rounded-full file:border-0 file:bg-stone-200 file:px-4 file:py-1.5 file:font-semibold file:text-stone-700 hover:file:bg-stone-300 dark:border-stone-600 dark:bg-stone-800/50 dark:text-stone-400 dark:file:bg-stone-700 dark:file:text-stone-300 dark:hover:file:bg-stone-600"
                    onChange={(e) => setImportScreenshotFile(e.target.files?.[0] ?? null)}
                    disabled={importing}
                  />
                  <button
                    type="submit"
                    disabled={importing || !importScreenshotFile}
                     className="w-full flex items-center justify-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-black active:scale-95 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
                  >
                    {importing ? "Importing…" : "Scan Image"}
                  </button>
                </form>
              </div>
            </div>
            
            {importError && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 dark:bg-red-950/30 dark:text-red-400 flex items-start gap-3 border border-red-100 dark:border-red-900/50">
                 <div className="mt-0.5 rounded-full bg-red-100 p-1 dark:bg-red-900/50">
                     <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <div>
                    <p className="font-bold">Import failed</p>
                    <p className="mt-1 opacity-90">{importError}</p>
                 </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 py-2 px-6">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          OR
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
      </div>

      {/* Manual Accordion */}
      <div className={`overflow-hidden rounded-[2rem] glass-panel transition-all ${expandedSection === "manual" ? "ring-2 ring-orange-500/50" : "opacity-80 hover:opacity-100 shadow-none border-stone-200/40"}`}>
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === "manual" ? "magic" : "manual")}
          className="flex w-full items-center justify-between p-6 sm:p-8 text-left"
        >
          <div className="flex items-center gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${expandedSection === "manual" ? "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400" : "bg-stone-100 text-stone-500 dark:bg-stone-800/60 dark:text-stone-400"}`}>
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">Enter Manually</h2>
              <p className="mt-0.5 text-xs font-medium text-stone-500 dark:text-stone-400">Fill out recipe details yourself</p>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-stone-400 transition-transform ${expandedSection === "manual" ? "rotate-180" : ""}`} />
        </button>

        {expandedSection === "manual" && (
          <div className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0 animate-in fade-in slide-in-from-top-4">
             <div className="h-px bg-stone-200/50 dark:bg-stone-700/50 mb-6 -mt-2" />
             <form onSubmit={handleSubmit} className="space-y-8">
               
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
                       onCreateNew={(name) => {
                         if (!addingIngredient) {
                           handleAddIngredient(name);
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
               
               <div className="pt-4">
                 <button
                   type="submit"
                   disabled={loading}
                   className="group flex w-full items-center justify-center gap-2 rounded-full bg-orange-600 px-8 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-orange-500 hover:shadow-2xl active:scale-95 disabled:opacity-60 dark:bg-orange-600 dark:hover:bg-orange-500"
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
