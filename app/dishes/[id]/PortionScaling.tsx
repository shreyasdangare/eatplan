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
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-amber-800">
          Servings:
        </label>
        <input
          type="range"
          min={1}
          max={20}
          value={desired}
          onChange={(e) => setDesired(Number(e.target.value))}
          className="flex-1 accent-orange-500"
        />
        <span className="w-8 text-sm font-medium text-amber-900">
          {desired}
        </span>
      </div>
      <IngredientList required={required} optional={optional} renderQty={renderQty} />
    </div>
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
    <div className="space-y-3">
      {required.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-amber-800">
            Required ingredients
          </h3>
          <ul className="space-y-1">
            {required.map((di) => (
              <li key={di.id} className="flex justify-between gap-2">
                <span>{di.ingredients?.name ?? "Unknown ingredient"}</span>
                <span className="text-xs text-amber-700">
                  {renderQty(di)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {optional.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-amber-800">
            Optional ingredients
          </h3>
          <ul className="space-y-1">
            {optional.map((di) => (
              <li key={di.id} className="flex justify-between gap-2">
                <span>{di.ingredients?.name ?? "Unknown ingredient"}</span>
                <span className="text-xs text-amber-700">
                  {renderQty(di)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
