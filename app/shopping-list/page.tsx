"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ShoppingTile, type ShoppingTileItem } from "@/app/components/ShoppingTile";
import { ShoppingItemDetail } from "@/app/components/ShoppingItemDetail";
import { ShoppingListHeader } from "@/app/components/ShoppingListHeader";
import { CategoryBrowser } from "@/app/components/CategoryBrowser";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { SHOPPING_CATEGORIES, getCategoryEmoji, inferCategoryFromName } from "@/lib/categoryEmoji";

function SortableTile({
  item,
  onTap,
  onOpenDetail,
  animating,
}: {
  item: ShoppingTileItem;
  onTap: (item: ShoppingTileItem) => void;
  onOpenDetail: (item: ShoppingTileItem) => void;
  animating?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Listeners on the wrapper (long-press anywhere on the tile starts a drag on touch);
  // a11y attributes on the tile's main button so there is no nested interactive role.
  const { role: _role, tabIndex: _tabIndex, ...a11y } = attributes;
  void _role;
  void _tabIndex;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      className={`no-callout touch-manipulation ${isDragging ? "relative z-50 scale-[1.03] opacity-95 shadow-xl rounded-xl" : ""}`}
    >
      <ShoppingTile item={item} onTap={onTap} onOpenDetail={onOpenDetail} animating={animating} dragAttributes={a11y} />
    </div>
  );
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ShoppingListPage() {
  const [toBuy, setToBuy] = useState<ShoppingTileItem[]>([]);
  const [bought, setBought] = useState<ShoppingTileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<{ id: string; name: string; category?: string | null }[]>([]);
  const [detailItem, setDetailItem] = useState<ShoppingTileItem | null>(null);
  const [populateLoading, setPopulateLoading] = useState(false);
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const [clearingBought, setClearingBought] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [mealPlanFrom, setMealPlanFrom] = useState("");
  const [mealPlanTo, setMealPlanTo] = useState("");

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shopping-list");
      if (res.ok) {
        const data = (await res.json()) as {
          to_buy?: ShoppingTileItem[];
          bought?: ShoppingTileItem[];
        };
        setToBuy(data.to_buy ?? []);
        setBought(data.bought ?? []);
      } else {
        setToBuy([]);
        setBought([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    const weekStart = getWeekStart(new Date());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    setMealPlanFrom(formatDate(weekStart));
    setMealPlanTo(formatDate(weekEnd));
  }, []);

  useEffect(() => {
    fetch("/api/ingredients")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setIngredients(Array.isArray(data) ? data : []))
      .catch(() => setIngredients([]));
  }, []);


  const handleTap = useCallback(
    (item: ShoppingTileItem) => {
      const nextStatus = item.status === "to_buy" ? "bought" : "to_buy";
      const updatedItem: ShoppingTileItem = {
        ...item,
        status: nextStatus,
        ...(nextStatus === "bought"
          ? { bought_at: new Date().toISOString() }
          : { bought_at: null }),
      } as ShoppingTileItem;

      if (nextStatus === "bought") {
        // Start buy animation
        setAnimatingIds((prev) => new Set(prev).add(item.id));
        // After animation completes, move to bought section
        setTimeout(() => {
          setAnimatingIds((prev) => {
            const next = new Set(prev);
            next.delete(item.id);
            return next;
          });
          setToBuy((prev) => prev.filter((i) => i.id !== item.id));
          setBought((prev) => [updatedItem, ...prev]);
        }, 420);
      } else {
        setBought((prev) => prev.filter((i) => i.id !== item.id));
        setToBuy((prev) => [...prev, updatedItem]);
      }

      // Persist in background; revert on failure
      fetch(`/api/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      }).then((res) => {
        if (!res.ok) loadList();
      });
    },
    [loadList]
  );

  const handleSaveDetail = useCallback(
    async (
      id: string,
      updates: {
        quantity?: string | null;
        urgency?: "normal" | "urgent" | "if_convenient";
        notes?: string | null;
      }
    ) => {
      const res = await fetch(`/api/shopping-list/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setDetailItem(null);
        loadList();
      }
    },
    [loadList]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/shopping-list/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDetailItem(null);
        loadList();
      }
    },
    [loadList]
  );

  const handleAddItem = useCallback(
    async (item: {
      ingredient_id?: string;
      custom_name?: string;
      quantity?: string;
      category?: string;
    }) => {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_id: item.ingredient_id ?? null,
          custom_name: item.custom_name ?? null,
          quantity: item.quantity ?? null,
          category: item.category ?? null,
          source: "manual",
        }),
      });
      if (res.ok) loadList();
    },
    [loadList]
  );

  const handleAddFromMealPlan = useCallback(() => {
    setShowMealPlanModal(true);
  }, []);

  const runPopulate = useCallback(async () => {
    setPopulateLoading(true);
    try {
      const res = await fetch("/api/shopping-list/populate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: mealPlanFrom, to: mealPlanTo }),
      });
      if (res.ok) {
        setShowMealPlanModal(false);
        loadList();
      }
    } finally {
      setPopulateLoading(false);
    }
  }, [mealPlanFrom, mealPlanTo, loadList]);

  const handleClearBought = useCallback(async (addToPantry: boolean = false) => {
    setClearingBought(true);
    try {
      // Optionally add bought items (with ingredient_id) to pantry
      if (addToPantry) {
        const pantryItems = bought.filter((i) => i.ingredient_id);
        if (pantryItems.length > 0) {
          await Promise.all(
            pantryItems.map((item) =>
              fetch("/api/pantry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ingredient_id: item.ingredient_id }),
              })
            )
          );
        }
      }
      const res = await fetch("/api/shopping-list/clear-bought", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        setBought([]);
      }
    } finally {
      setClearingBought(false);
    }
  }, [bought]);

  const [showClearModal, setShowClearModal] = useState(false);

  const copyList = useCallback(() => {
    const text = toBuy
      .map((i) => {
        const name = i.ingredient_name ?? i.custom_name ?? "Unknown";
        return i.quantity ? `${name}: ${i.quantity}` : name;
      })
      .join("\n");
    if (text) void navigator.clipboard.writeText(text);
  }, [toBuy]);

  // Mouse: drag after 8px. Touch: long-press (200ms) so normal swipes still scroll the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = toBuy.findIndex((i) => i.id === active.id);
      const newIndex = toBuy.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(toBuy, oldIndex, newIndex);
      setToBuy(reordered);
      const res = await fetch("/api/shopping-list/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ordered_ids: reordered.map((i) => i.id),
        }),
      });
      if (!res.ok) loadList();
    },
    [toBuy, loadList]
  );

  return (
    <section className="space-y-3">
      <ShoppingListHeader
        onAddFromMealPlan={handleAddFromMealPlan}
        onCopyList={copyList}
        onAddItem={handleAddItem}
        toBuyCount={toBuy.length}
        populateLoading={populateLoading}
      />

      <CategoryBrowser ingredients={ingredients} onAddItem={handleAddItem} />

      {loading ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">Loading…</p>
      ) : (
        <>
          <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-2 dark:border-stone-600 dark:bg-stone-800/80">
            <h3 className="mb-2 px-0.5 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              To buy{groupByCategory ? " · by aisle" : ""} <span className="font-medium normal-case tracking-normal">· hold &amp; drag to reorder</span>
            </h3>
            {toBuy.length === 0 && bought.length === 0 ? (
              <p className="py-4 text-center text-sm text-amber-800 dark:text-amber-200">
                Add items above or from meal plan.
              </p>
            ) : toBuy.length === 0 ? (
              <p className="py-2 text-sm text-amber-800 dark:text-amber-200">
                All done. Tap items below to re-add.
              </p>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={toBuy.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  {groupByCategory ? (
                    <div className="space-y-2">
                      {(() => {
                        const groups = new Map<string, ShoppingTileItem[]>();
                        for (const item of toBuy) {
                          const name = item.ingredient_name ?? item.custom_name ?? "";
                          const cat = item.category?.trim() || inferCategoryFromName(name) || "Other";
                          if (!groups.has(cat)) groups.set(cat, []);
                          groups.get(cat)!.push(item);
                        }
                        // Sort groups by SHOPPING_CATEGORIES order
                        const ordered = [...SHOPPING_CATEGORIES, "Other"].filter((c) => groups.has(c));
                        // Include any categories not in SHOPPING_CATEGORIES
                        for (const c of groups.keys()) {
                          if (!ordered.includes(c)) ordered.push(c);
                        }
                        return ordered.map((cat) => {
                          const items = groups.get(cat) ?? [];
                          if (items.length === 0) return null;
                          return (
                            <div key={cat}>
                              <div className="mb-1 flex items-center gap-1.5 px-0.5">
                                <span className="text-sm" aria-hidden>{getCategoryEmoji(cat)}</span>
                                <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                                  {cat} ({items.length})
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                {items.map((item) => (
                                  <SortableTile
                                    key={item.id}
                                    item={item}
                                    onTap={handleTap}
                                    onOpenDetail={setDetailItem}
                                    animating={animatingIds.has(item.id)}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                      {toBuy.map((item) => (
                        <SortableTile
                          key={item.id}
                          item={item}
                          onTap={handleTap}
                          onOpenDetail={setDetailItem}
                          animating={animatingIds.has(item.id)}
                        />
                      ))}
                    </div>
                  )}
                </SortableContext>
              </DndContext>
            )}
          </div>

          {bought.length > 0 && (
            <div className="rounded-lg border border-lime-200 bg-lime-50/50 p-2 dark:border-lime-800 dark:bg-lime-950/30">
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wide text-lime-800 dark:text-lime-200">
                  Recently bought · tap to re-add
                </h3>
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  disabled={clearingBought}
                  className="min-h-11 rounded-full bg-lime-200 px-4 text-sm font-semibold text-lime-900 hover:bg-lime-300 disabled:opacity-50 dark:bg-lime-900/60 dark:text-lime-100 dark:hover:bg-lime-800/60"
                >
                  {clearingBought ? "Clearing…" : "Clear all"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {bought.map((item) => (
                  <ShoppingTile
                    key={item.id}
                    item={item}
                    onTap={handleTap}
                    onOpenDetail={setDetailItem}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <BottomSheet
        open={showMealPlanModal}
        onClose={() => setShowMealPlanModal(false)}
        dismissible={!populateLoading}
        title="Add from meal plan"
        subtitle="Ingredients from planned meals are merged into your list."
        footer={
          <button
            type="button"
            onClick={runPopulate}
            disabled={populateLoading}
            className="min-h-12 w-full rounded-full bg-orange-600 text-base font-bold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {populateLoading ? "Adding…" : "Add ingredients"}
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
            From
            <input
              type="date"
              value={mealPlanFrom}
              onChange={(e) => setMealPlanFrom(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-stone-700 dark:text-stone-200">
            To
            <input
              type="date"
              value={mealPlanTo}
              onChange={(e) => setMealPlanTo(e.target.value)}
              className="min-h-12 w-full rounded-xl border border-stone-300 bg-white px-3 text-base dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
        </div>
      </BottomSheet>

      <BottomSheet
        open={showClearModal}
        onClose={() => setShowClearModal(false)}
        dismissible={!clearingBought}
        title="Clear bought items"
        subtitle={
          bought.filter((i) => i.ingredient_id).length > 0
            ? `${bought.filter((i) => i.ingredient_id).length} items can be added to your pantry before clearing.`
            : "Remove all bought items from the list?"
        }
        footer={
          <div className="flex flex-col gap-2">
            {bought.filter((i) => i.ingredient_id).length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowClearModal(false);
                  handleClearBought(true);
                }}
                disabled={clearingBought}
                className="min-h-12 w-full rounded-full bg-lime-700 text-base font-bold text-white hover:bg-lime-800 disabled:opacity-50"
              >
                Add to pantry &amp; clear
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowClearModal(false);
                handleClearBought(false);
              }}
              disabled={clearingBought}
              className="min-h-12 w-full rounded-full border border-stone-300 text-base font-semibold text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
            >
              Clear only
            </button>
          </div>
        }
      >
        <span className="sr-only">Choose how to clear bought items.</span>
      </BottomSheet>

      <ShoppingItemDetail
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onSave={handleSaveDetail}
        onDelete={handleDeleteItem}
      />

    </section>
  );
}
