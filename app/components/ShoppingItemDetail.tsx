"use client";

import { useEffect, useState } from "react";
import type { ShoppingTileItem } from "./ShoppingTile";

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

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60"
        aria-hidden
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-item-detail-title"
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-auto rounded-t-2xl border border-t border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
          <h2
            id="shopping-item-detail-title"
            className="text-sm font-semibold text-amber-900 dark:text-amber-100"
          >
            {name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-amber-800 dark:text-amber-200">
              Quantity
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2 liters, 500g"
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-amber-800 dark:text-amber-200">
              Priority
            </label>
            <div className="flex gap-2">
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
                  onClick={() => setUrgency(opt.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                    urgency === opt.value
                      ? "bg-orange-500 text-white dark:bg-orange-600"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-700 dark:text-stone-300 dark:hover:bg-stone-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-amber-800 dark:text-amber-200">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-full bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 dark:bg-orange-600 dark:hover:bg-orange-500"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-red-300 bg-white py-2.5 px-4 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-stone-800 dark:text-red-300 dark:hover:bg-red-950/30 disabled:opacity-50"
            >
              {deleting ? "…" : "Remove"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
