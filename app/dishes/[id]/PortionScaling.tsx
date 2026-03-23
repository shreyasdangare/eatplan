"use client";

import { useState } from "react";
import { Scale } from "lucide-react";
import { TranslatedIngredient } from "@/app/components/TranslatedIngredient";

type IngredientRow = {
  id: string;
  ingredient_id: string;
  quantity: string | null;
  amount: number | null;
  unit: string | null;
  is_optional: boolean;
  ingredients?: { name: string } | null;
};

export function PortionScaling({
  baseServings,
  required,
  optional
}: {
  baseServings: number | null;
  required: IngredientRow[];
  optional: IngredientRow[];
}) {
  const base = baseServings && baseServings > 0 ? baseServings : 1;
  const [desired, setDesired] = useState(base);
  const multiplier = desired / base;

  const renderQty = (di: IngredientRow) => {
    if (di.amount != null && di.unit) {
      const scaled = Math.round(di.amount * multiplier * 100) / 100;
      return `${scaled} ${di.unit}`;
    }
    return di.quantity ?? "—";
  };

  if (baseServings == null || baseServings < 1) {
    return (
      <IngredientList required={required} optional={optional} renderQty={renderQty} />
    );
  }

  return (
    <section className="space-y-6">
      {/* Slider */}
      <div className="rounded-[2rem] glass-panel p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
           <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-stone-800 dark:text-orange-500">
             <Scale className="h-5 w-5" />
           </div>
           <div>
             <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
               Yield
             </h3>
             <p className="text-base font-semibold text-stone-900 dark:text-stone-50">
               Scale ingredients
             </p>
           </div>
        </div>
        
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={20}
            value={desired}
            onChange={(e) => setDesired(Number(e.target.value))}
            className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer dark:bg-stone-700 accent-orange-500 hover:accent-orange-600 transition-all"
            aria-label="Adjust servings"
          />
          <div className="flex shrink-0 min-w-[3rem] items-center justify-center rounded-xl bg-stone-100 px-3 py-1.5 font-mono text-lg font-bold text-stone-800 dark:bg-stone-800 dark:text-stone-200">
            {desired}
          </div>
        </div>
      </div>

      <IngredientList required={required} optional={optional} renderQty={renderQty} />
    </section>
  );
}

function IngredientList({
  required,
  optional,
  renderQty
}: {
  required: IngredientRow[];
  optional: IngredientRow[];
  renderQty: (di: IngredientRow) => string;
}) {
  return (
    <div className="space-y-8">
      {required.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
              Ingredients
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent dark:from-stone-700" />
          </div>
          <ul className="flex flex-col gap-2">
            {required.map((di) => (
              <li
                key={di.id}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl glass-panel px-5 py-3.5 transition-all hover:bg-stone-50/80 dark:hover:bg-stone-800/80"
              >
                <span className="text-base font-medium text-stone-800 dark:text-stone-200 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors flex items-center">
                  <TranslatedIngredient name={di.ingredients?.name ?? "Unknown ingredient"} />
                </span>
                <span className="shrink-0 rounded-lg bg-stone-100/50 px-3 py-1 font-mono text-sm font-semibold text-stone-600 dark:bg-stone-800/50 dark:text-stone-400">
                  {renderQty(di)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      
      {optional.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-4">
            <h2 className="text-lg font-bold tracking-tight text-stone-500 dark:text-stone-400">
              Optional
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-stone-200 to-transparent dark:from-stone-800" />
          </div>
          <ul className="flex flex-col gap-2">
            {optional.map((di) => (
              <li
                key={di.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-dashed border-stone-200/80 bg-stone-50/30 px-5 py-3.5 dark:border-stone-700/50 dark:bg-stone-800/20"
              >
                <span className="text-base font-medium text-stone-600 dark:text-stone-400 flex items-center">
                  <TranslatedIngredient name={di.ingredients?.name ?? "Unknown ingredient"} />
                </span>
                <span className="shrink-0 rounded-lg bg-stone-100/30 px-3 py-1 font-mono text-sm font-medium text-stone-500 dark:bg-stone-800/30 dark:text-stone-500">
                  {renderQty(di)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
