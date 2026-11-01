"use client";
import { toISODate, weekStartOf } from "@/lib/dates";

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
import { ShoppingCart } from "lucide-react";
import { ShoppingTile, type ShoppingTileItem } from "@/app/components/ShoppingTile";
import { ShoppingItemDetail } from "@/app/components/ShoppingItemDetail";
import { ShoppingListHeader } from "@/app/components/ShoppingListHeader";
import { CategoryBrowser } from "@/app/components/CategoryBrowser";
import { BottomSheet } from "@/app/components/ui/BottomSheet";
import { Skeleton, LoadingRegion } from "@/app/components/ui/Skeleton";
import { toast } from "@/app/components/ui/Toast";
import { SHOPPING_CATEGORIES, inferCategoryFromName } from "@/lib/categoryEmoji";

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
      <ShoppingTile item={item} onTap={onTap} onOpenDetail={onOpenDetail} animating={animating} dragAttributes={a11y} disabled={item.id.startsWith("temp-")} />
    </div>
  );
}

// Local-date helpers: toISOString() shifts to UTC and turned Monday into Sunday east of UTC (e.g. India/Europe).
const getWeekStart = weekStartOf;
const formatDate = toISODate;

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

      if (navigator.vibrate) navigator.vibrate(nextStatus === "bought" ? 12 : 6);
      // Persist in background; revert on failure
      fetch(`/api/shopping-list/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
        .then((res) => {
          if (!res.ok) throw new Error();
        })
        .catch(() => {
          toast({ message: "Couldn't sync that change. Refreshing…", tone: "error" });
          loadList();
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
      const apply = (list: ShoppingTileItem[]) => list.map((i) => (i.id === id ? { ...i, ...updates } : i));
      setToBuy(apply);
      setBought(apply);
      setDetailItem(null);
      const res = await fetch(`/api/shopping-list/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      }).catch(() => null);
      if (!res?.ok) {
        toast({ message: "Couldn't save changes.", tone: "error" });
        loadList();
      }
    },
    [loadList]
  );

  const handleDeleteItem = useCallback(
    async (id: string) => {
      setToBuy((prev) => prev.filter((i) => i.id !== id));
      setBought((prev) => prev.filter((i) => i.id !== id));
      setDetailItem(null);
      const res = await fetch(`/api/shopping-list/${id}`, { method: "DELETE" }).catch(() => null);
      if (!res?.ok) {
        toast({ message: "Couldn't remove item.", tone: "error" });
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
      name?: string;
    }) => {
      // Optimistic: show the tile immediately, swap in the saved row when the API answers.
      const tempId = `temp-${Date.now()}`;
      const known = item.ingredient_id ? ingredients.find((i) => i.id === item.ingredient_id) : undefined;
      const displayName = item.name ?? known?.name ?? item.custom_name ?? "Item";
      const temp: ShoppingTileItem = {
        id: tempId,
        ingredient_id: item.ingredient_id ?? null,
        custom_name: item.custom_name ?? null,
        ingredient_name: item.ingredient_id ? displayName : null,
        quantity: item.quantity ?? null,
        category: item.category ?? known?.category ?? null,
        status: "to_buy",
        source: "manual",
      };
      setToBuy((prev) => [...prev, temp]);
      if (navigator.vibrate) navigator.vibrate(8);
      try {
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
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { items?: ShoppingTileItem[] };
        const saved = data.items?.[0];
        setToBuy((prev) => prev.map((i) => (i.id === tempId && saved ? { ...temp, ...saved } : i)));
      } catch {
        setToBuy((prev) => prev.filter((i) => i.id !== tempId));
        toast({ message: `Couldn't add ${displayName}.`, tone: "error" });
      }
    },
    [ingredients]
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
        const data = (await res.json().catch(() => ({}))) as { added?: number; message?: string };
        toast(
          data.added
            ? `Added ${data.added} item${data.added === 1 ? "" : "s"} from your plan`
            : data.message ?? "Nothing new to add"
        );
      } else {
        toast({ message: "Couldn't add from the plan.", tone: "error" });
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
    if (text) void navigator.clipboard.writeText(text).then(() => toast("List copied"), () => toast({ message: "Copy failed", tone: "error" }));
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
        <LoadingRegion label="Loading your shopping list">
          <div className="space-y-2 rounded-2xl border-2 border-stone-300 p-3 dark:border-stone-700">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-[52px]" />
              ))}
            </div>
          </div>
        </LoadingRegion>
      ) : toBuy.length === 0 && bought.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border-2 border-dashed border-ink bg-white px-6 py-10 text-center dark:border-stone-600 dark:bg-stone-900">
          <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink bg-saffron text-ink shadow-md" aria-hidden><ShoppingCart className="h-7 w-7" strokeWidth={2.5} /></span>
          <h2 className="mt-3 text-xl font-extrabold text-ink dark:text-stone-50">Your list is empty</h2>
          <p className="mt-1 max-w-xs text-sm text-stone-700 dark:text-stone-300">
            Type an item above, or pull in everything you need for this week&apos;s meals.
          </p>
          <button
            type="button"
            onClick={handleAddFromMealPlan}
            className="press mt-4 min-h-12 rounded-2xl border-2 border-ink bg-saffron px-6 text-base font-extrabold text-ink shadow-hard dark:border-stone-950"
          >
            Add from this week&apos;s plan
          </button>
        </div>
      ) : (
        <>
          <div className="sticker-card rounded-3xl p-3">
            <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 px-0.5 text-sm font-extrabold uppercase tracking-wider text-ink dark:text-stone-100">
              To buy{groupByCategory ? " · by aisle" : ""} <span className="text-xs font-semibold normal-case tracking-normal text-stone-600 dark:text-stone-400">hold &amp; drag to reorder</span>
            </h3>
            {toBuy.length === 0 && bought.length === 0 ? (
              <p className="py-4 text-center text-sm text-stone-600 dark:text-stone-400">
                Add items above or from meal plan.
              </p>
            ) : toBuy.length === 0 ? (
              <p className="py-2 text-sm text-stone-600 dark:text-stone-400">
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
                        const ordered = [...new Set([...SHOPPING_CATEGORIES, "Other"])].filter((c) => groups.has(c));
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

                                <span className="rounded-full border-2 border-ink bg-cream px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide text-ink dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100">
                                  {cat} ({items.length})
                                </span>
                              </div>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
            <div className="rounded-3xl border-2 border-dashed border-leaf p-3 dark:border-leaf">
              <div className="mb-1.5 flex items-center justify-between px-0.5">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-leaf dark:text-emerald-300">
                  Recently bought · tap to re-add
                </h3>
                <button
                  type="button"
                  onClick={() => setShowClearModal(true)}
                  disabled={clearingBought}
                  className="btn-outline press min-h-11 text-sm disabled:opacity-50"
                >
                  {clearingBought ? "Clearing…" : "Clear all"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
            className="press min-h-12 w-full rounded-2xl border-2 border-ink bg-saffron text-base font-extrabold text-ink shadow-hard disabled:opacity-50 dark:border-stone-950"
          >
            {populateLoading ? "Adding…" : "Add ingredients"}
          </button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm font-extrabold text-ink dark:text-stone-200">
            From
            <input
              type="date"
              value={mealPlanFrom}
              onChange={(e) => setMealPlanFrom(e.target.value)}
              className="min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-3 text-base font-semibold dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-extrabold text-ink dark:text-stone-200">
            To
            <input
              type="date"
              value={mealPlanTo}
              onChange={(e) => setMealPlanTo(e.target.value)}
              className="min-h-12 w-full rounded-2xl border-2 border-ink bg-white px-3 text-base font-semibold dark:border-stone-500 dark:bg-stone-950 dark:text-stone-100"
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
                className="press min-h-12 w-full rounded-2xl border-2 border-ink bg-leaf text-base font-extrabold text-white shadow-hard disabled:opacity-50 dark:border-stone-950"
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
              className="btn-outline press min-h-12 w-full text-base"
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
