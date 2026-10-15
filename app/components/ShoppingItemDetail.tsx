"use client";

import { useEffect, useState } from "react";
import type { ShoppingTileItem } from "./ShoppingTile";
import { BottomSheet } from "./ui/BottomSheet";

type ShoppingItemDetailProps = {
  item: ShoppingTileItem | null;
  onClose: () => void;
  onSave: (
    id: string,
    updates: {
      quantity?: string | null;
      urgency?: "normal" | "urgent" | "if_convenient";
      notes?: string | null;
    }
  ) => Promise<void> | void;
  onDelete: (id: string) => void;
};

export function ShoppingItemDetail({
  item,
  onClose,
  onSave,
  onDelete,
}: ShoppingItemDetailProps) {
  const [quantity, setQuantity] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "urgent" | "if_convenient">(
    "normal"
  );
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity ?? "");
      setUrgency(item.urgency ?? "normal");
      setNotes(item.notes ?? "");
    }
  }, [item]);

  if (!item) return null;

  const name =
    item.ingredient_name ?? item.custom_name ?? "Unknown";

  const handleSave = async () => {
    setSaving(true);
    try {
      onSave(item.id, {
        quantity: quantity.trim() || null,
        urgency,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${name}" from the list?`)) return;
    setDeleting(true);
    try {
      onDelete(item.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const fieldCls =
    "w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-base text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100";
  const labelCls = "mb-1.5 block text-sm font-semibold text-stone-700 dark:text-stone-200";

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={name}
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="min-h-12 rounded-full border border-red-300 bg-white px-5 text-base font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-stone-800 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            {deleting ? "…" : "Remove"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-12 flex-1 rounded-full bg-orange-600 text-base font-bold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div>
          <label htmlFor="shopping-item-qty" className={labelCls}>
            Quantity
          </label>
          <input
            id="shopping-item-qty"
            type="text"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 2 liters, 500g"
            autoComplete="off"
            enterKeyHint="done"
            className={fieldCls}
          />
        </div>

        <fieldset>
          <legend className={labelCls}>Priority</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Priority">
            {(
              [
                { value: "normal" as const, label: "Normal" },
                { value: "urgent" as const, label: "Urgent" },
                { value: "if_convenient" as const, label: "If convenient" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={urgency === opt.value}
                onClick={() => setUrgency(opt.value)}
                className={`min-h-11 rounded-full px-2 text-sm font-semibold ${
                  urgency === opt.value
                    ? opt.value === "urgent"
                      ? "bg-red-600 text-white"
                      : "bg-orange-600 text-white"
                    : "bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="shopping-item-notes" className={labelCls}>
            Notes
          </label>
          <textarea
            id="shopping-item-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            rows={2}
            className={fieldCls}
          />
        </div>
      </form>
    </BottomSheet>
  );
}
