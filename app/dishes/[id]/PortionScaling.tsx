"use client";

import { useState } from "react";

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
      <>
        <IngredientList required={required} optional={optional} renderQty={renderQty} />
      </>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-stone-700">
          Servings
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={desired}
          onChange={(e) => setDesired(Number(e.target.value))}
          className="flex-1 accent-stone-800"
        />
        <span className="w-8 text-sm font-medium text-stone-900">
          {desired}
        </span>
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
    <div className="space-y-4">
      {required.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Ingredients
          </h2>
          <ul className="space-y-2">
            {required.map((di) => (
              <li
                key={di.id}
                className="flex justify-between gap-4 border-b border-stone-100 py-2 last:border-0"
              >
                <span className="text-stone-800">
                  {di.ingredients?.name ?? "Unknown ingredient"}
                </span>
                <span className="shrink-0 text-stone-500">
                  {renderQty(di)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {optional.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
            Optional
          </h2>
          <ul className="space-y-2">
            {optional.map((di) => (
              <li
                key={di.id}
                className="flex justify-between gap-4 border-b border-stone-100 py-2 text-stone-600 last:border-0"
              >
                <span>{di.ingredients?.name ?? "Unknown ingredient"}</span>
                <span className="shrink-0">{renderQty(di)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
