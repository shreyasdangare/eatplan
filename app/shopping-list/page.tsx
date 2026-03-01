"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
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

function SortableTile({
  item,
  onTap,
  onOpenDetail,
}: {
  item: ShoppingTileItem;
  onTap: (item: ShoppingTileItem) => void;
  onOpenDetail: (item: ShoppingTileItem) => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={isDragging ? "z-50 opacity-90" : ""}
    >
      <ShoppingTile item={item} onTap={onTap} onOpenDetail={onOpenDetail} />
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
  const [showMealPlanModal, setShowMealPlanModal] = useState(false);
  const [mealPlanFrom, setMealPlanFrom] = useState("");
  const [mealPlanTo, setMealPlanTo] = useState("");
  const [todoistOpen, setTodoistOpen] = useState(false);
  const [todoistConnected, setTodoistConnected] = useState<boolean | null>(null);
  const [todoistProjects, setTodoistProjects] = useState<{ id: string; name: string }[]>([]);
  const [syncProjectId, setSyncProjectId] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ created: number; failed: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ added: number; skipped: number } | null>(null);

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

  useEffect(() => {
    fetch("/api/auth/todoist/status")
      .then((r) => r.json())
      .then(async (d: { connected: boolean; project_id?: string | null }) => {
        setTodoistConnected(d.connected);
        if (!d.connected) return;
        const projRes = await fetch("/api/todoist/projects");
        const projData = projRes.ok ? await projRes.json() : { projects: [] };
        const projects = projData.projects ?? [];
        if (projects.length) {
          setTodoistProjects(projects);
          const saved = d.project_id && projects.some((p: { id: string }) => p.id === d.project_id) ? d.project_id : null;
          const shopping = projects.find((p: { name: string }) => /shopping|list|grocery/i.test(p.name));
          setSyncProjectId((prev) => prev || saved || shopping?.id || projects[0].id);
        }
      })
      .catch(() => setTodoistConnected(false));
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

      // Optimistic update: move in UI immediately
      if (nextStatus === "bought") {
        setToBuy((prev) => prev.filter((i) => i.id !== item.id));
        setBought((prev) => [updatedItem, ...prev]);
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

  const copyList = useCallback(() => {
    const text = toBuy
      .map((i) => {
        const name = i.ingredient_name ?? i.custom_name ?? "Unknown";
        return i.quantity ? `${name}: ${i.quantity}` : name;
      })
      .join("\n");
    if (text) void navigator.clipboard.writeText(text);
  }, [toBuy]);

  const pushToTodoist = async () => {
    if (toBuy.length === 0 || !syncProjectId) return;
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch("/api/todoist/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_buy: toBuy.map((i) => ({
            ingredient_name: i.ingredient_name ?? i.custom_name ?? "Unknown",
            quantity_display: i.quantity ?? "",
          })),
          project_id: syncProjectId,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (data) setPushResult({ created: data.created ?? 0, failed: data.failed ?? 0 });
    } finally {
      setPushing(false);
    }
  };

  const syncFromTodoist = async () => {
    if (!syncProjectId) return;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/pantry/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: syncProjectId }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.ok) setSyncResult({ added: data.added ?? 0, skipped: data.skipped ?? 0 });
    } finally {
      setSyncing(false);
    }
  };

  const disconnectTodoist = async () => {
    await fetch("/api/auth/todoist/disconnect", { method: "POST" });
    setTodoistConnected(false);
    setTodoistProjects([]);
    setSyncProjectId("");
    setSyncResult(null);
    setPushResult(null);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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
        <p className="text-sm text-amber-700 dark:text-amber-300">Loading…</p>
      ) : (
        <>
          <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-2 dark:border-stone-600 dark:bg-stone-800/80">
            <h3 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              To buy · drag to reorder
            </h3>
            {toBuy.length === 0 && bought.length === 0 ? (
              <p className="py-4 text-center text-xs text-amber-600 dark:text-amber-400">
                Add items above or from meal plan.
              </p>
            ) : toBuy.length === 0 ? (
              <p className="py-2 text-xs text-amber-600 dark:text-amber-400">
                All done. Tap items below to re-add.
              </p>
            ) : (
              <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={toBuy.map((i) => i.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
                    {toBuy.map((item) => (
                      <SortableTile
                        key={item.id}
                        item={item}
                        onTap={handleTap}
                        onOpenDetail={setDetailItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {bought.length > 0 && (
            <div className="rounded-lg border border-lime-200 bg-lime-50/50 p-2 dark:border-lime-800 dark:bg-lime-950/30">
              <h3 className="mb-1.5 px-0.5 text-[11px] font-semibold uppercase tracking-wide text-lime-700 dark:text-lime-300">
                Recently bought · tap to re-add
              </h3>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
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

      {showMealPlanModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 dark:bg-black/60"
            aria-hidden
            onClick={() => !populateLoading && setShowMealPlanModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-orange-200 bg-white p-4 shadow-lg dark:border-stone-600 dark:bg-stone-900">
            <h3 className="mb-3 text-sm font-semibold text-amber-900 dark:text-amber-100">
              Add from meal plan
            </h3>
            <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
              Choose a date range. Ingredients from planned meals will be merged into your list.
            </p>
            <div className="mb-3 flex gap-2">
              <input
                type="date"
                value={mealPlanFrom}
                onChange={(e) => setMealPlanFrom(e.target.value)}
                className="flex-1 rounded-lg border border-orange-200 px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
              <span className="self-center text-amber-600 dark:text-amber-400">to</span>
              <input
                type="date"
                value={mealPlanTo}
                onChange={(e) => setMealPlanTo(e.target.value)}
                className="flex-1 rounded-lg border border-orange-200 px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runPopulate}
                disabled={populateLoading}
                className="flex-1 rounded-full bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-50 dark:bg-orange-600"
              >
                {populateLoading ? "Adding…" : "Add ingredients"}
              </button>
              <button
                type="button"
                onClick={() => !populateLoading && setShowMealPlanModal(false)}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium dark:border-stone-600 dark:text-stone-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      <ShoppingItemDetail
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onSave={handleSaveDetail}
        onDelete={handleDeleteItem}
      />

      {/* Todoist: legacy / integrations (collapsible) */}
      <div className="rounded-lg border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-600 dark:bg-stone-800/50">
        <button
          type="button"
          onClick={() => setTodoistOpen((p) => !p)}
          className="flex w-full items-center justify-between text-left text-xs font-semibold text-stone-600 dark:text-stone-400"
        >
          <span>Integrations (Todoist)</span>
          <svg
            className={`h-4 w-4 transition-transform ${todoistOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {todoistOpen && (
          <div className="mt-2 space-y-2 border-t border-stone-200 pt-2 dark:border-stone-600">
            {todoistConnected === null ? (
              <p className="text-xs text-stone-500">Checking…</p>
            ) : todoistConnected ? (
              <>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  Push list to Todoist or sync completed tasks into pantry.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={syncProjectId}
                    onChange={(e) => setSyncProjectId(e.target.value)}
                    className="rounded border border-stone-300 bg-white px-2 py-1.5 text-xs dark:border-stone-600 dark:bg-stone-700 dark:text-stone-100"
                  >
                    {todoistProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={pushing || toBuy.length === 0 || !syncProjectId}
                    onClick={pushToTodoist}
                    className="rounded-full bg-lime-500 px-3 py-1.5 text-xs font-medium text-lime-950 disabled:opacity-50 hover:bg-lime-400"
                  >
                    {pushing ? "Pushing…" : "Push to Todoist"}
                  </button>
                  <button
                    type="button"
                    disabled={syncing || !syncProjectId}
                    onClick={syncFromTodoist}
                    className="rounded-full bg-amber-200 px-3 py-1.5 text-xs font-medium text-amber-900 disabled:opacity-50 hover:bg-amber-300"
                  >
                    {syncing ? "Syncing…" : "Sync from Todoist"}
                  </button>
                  <button
                    type="button"
                    onClick={disconnectTodoist}
                    className="rounded-full border border-stone-300 px-3 py-1.5 text-xs text-stone-700 dark:border-stone-600 dark:text-stone-300"
                  >
                    Disconnect
                  </button>
                </div>
                {syncResult !== null && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    Added {syncResult.added} to pantry, {syncResult.skipped} not matched.
                  </p>
                )}
                {pushResult !== null && (
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    {pushResult.created > 0 && `${pushResult.created} item(s) added to Todoist. `}
                    {pushResult.failed > 0 && `${pushResult.failed} failed.`}
                  </p>
                )}
              </>
            ) : (
              <a
                href="/api/auth/todoist"
                className="inline-block rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-400 dark:bg-orange-600"
              >
                Sign in with Todoist
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
