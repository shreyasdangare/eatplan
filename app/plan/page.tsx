"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Utensils, Moon, CheckCircle2, Circle, X, ChevronLeft, ChevronRight } from "lucide-react";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner"
};

const SLOT_ICONS: Record<string, any> = {
  breakfast: Sun,
  lunch: Utensils,
  dinner: Moon
};

function DraggableDish({ dish }: { dish: Dish }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dish.id
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`shrink-0 cursor-grab rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition-all active:cursor-grabbing ${
        isDragging
          ? "border-orange-500 bg-orange-100 text-orange-900 opacity-50 dark:bg-orange-900/50 dark:text-orange-100"
          : "border-stone-200/50 bg-white/80 text-stone-700 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-900 hover:shadow-md dark:border-stone-700/50 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:border-orange-600 dark:hover:bg-stone-700"
      }`}
    >
      {dish.name}
    </button>
  );
}

function DroppableSlot({
  date,
  slot,
  current,
  prepared,
  onClear,
  onMarkPrepared,
  preparing
}: {
  date: string;
  slot: string;
  current: string | null;
  prepared: boolean;
  onClear: () => void;
  onMarkPrepared: () => void;
  preparing: boolean;
}) {
  const slotId = `${date}:${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotId });

  return (
    <td className="min-w-[8rem] border-b border-stone-200/50 p-2 align-top dark:border-stone-700/50 sm:min-w-[10rem] group/slot">
      <div
        ref={setNodeRef}
        className={`relative flex min-h-[5.5rem] flex-col rounded-[1.25rem] border-2 p-3 transition-all duration-300 ${
          isOver
            ? "scale-[1.02] border-orange-400 bg-orange-50 shadow-md dark:border-orange-500/80 dark:bg-orange-900/30"
            : prepared
            ? "border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-700/80 dark:bg-emerald-950/40"
            : "border-dashed border-stone-200/60 bg-stone-50/40 hover:border-stone-300 dark:border-stone-700/60 dark:bg-stone-800/30 dark:hover:border-stone-600"
        }`}
      >
        {current ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`min-w-0 flex-1 break-words text-sm font-semibold leading-tight ${
                  prepared ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-800 dark:text-stone-200"
                }`}
                title={current}
              >
                {current}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 -mr-1 -mt-1 rounded-full p-1.5 text-stone-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover/slot:opacity-100 dark:text-stone-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                aria-label="Clear slot"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-auto pt-3">
              {!prepared ? (
                <button
                  type="button"
                  disabled={preparing}
                  onClick={onMarkPrepared}
                  className="group/btn flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-emerald-600 disabled:opacity-50 dark:text-stone-400 dark:hover:text-emerald-400"
                >
                  <Circle className="h-3.5 w-3.5 transition-colors group-hover/btn:fill-emerald-100 dark:group-hover/btn:fill-emerald-900" />
                  {preparing ? "Saving…" : "Mark done"}
                </button>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5 fill-emerald-100 dark:fill-emerald-900" />
                  Done
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover/slot:opacity-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Drop here
            </span>
          </div>
        )}
      </div>
    </td>
  );
}

type Dish = { id: string; name: string };
type PlanEntry = {
  id: string;
  date: string;
  slot_type: string;
  dish_id: string | null;
  prepared_at: string | null;
  dishes?: { id: string; name: string } | null;
};

const SLOTS = ["breakfast", "lunch", "dinner"] as const;

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(weekStart: Date): string[] {
  const out: string[] = [];
  const d = new Date(weekStart);
  for (let i = 0; i < 7; i++) {
    out.push(formatDate(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function getWeekStart(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function PlanPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const n = new Date();
    return getWeekStart(n);
  });
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [preparingSlot, setPreparingSlot] = useState<string | null>(null);

  const weekDates = getWeekDates(weekStart);
  const from = weekDates[0];
  const to = weekDates[6];

  useEffect(() => {
    (async () => {
      const [dishesRes, plansRes] = await Promise.all([
        fetch("/api/dishes"),
        fetch(`/api/meal-plans?from=${from}&to=${to}`)
      ]);
      if (dishesRes.ok) setDishes((await dishesRes.json()) ?? []);
      if (plansRes.ok) setPlans((await plansRes.json()) ?? []);
      setLoading(false);
    })();
  }, [from, to]);

  const setSlot = useCallback(
    async (date: string, slot_type: string, dish_id: string | null) => {
      let previousPlans: PlanEntry[] = [];

      setPlans((prev) => {
        previousPlans = prev;
        const rest = prev.filter(
          (p) => !(p.date === date && p.slot_type === slot_type)
        );
        if (dish_id) {
          const dish = dishes.find((d) => d.id === dish_id);
          return [
            ...rest,
            {
              id: crypto.randomUUID(),
              date,
              slot_type,
              dish_id,
              prepared_at: null,
              dishes: dish ? { id: dish.id, name: dish.name } : null
            }
          ];
        }
        return rest;
      });

      try {
        const res = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot_type, dish_id })
        });
        if (!res.ok) {
          throw new Error("Failed to update slot");
        }
      } catch (err) {
        console.error("Optimistic update failed, rolling back:", err);
        setPlans(previousPlans);
      }
    },
    [dishes]
  );

  const getSlotDish = useCallback(
    (date: string, slot_type: string) => {
      const p = plans.find(
        (x) => x.date === date && x.slot_type === slot_type
      );
      return p?.dishes?.name ?? p?.dish_id
        ? dishes.find((d) => d.id === p.dish_id)?.name
        : null;
    },
    [plans, dishes]
  );

  const getSlotPrepared = useCallback(
    (date: string, slot_type: string) => {
      const p = plans.find(
        (x) => x.date === date && x.slot_type === slot_type
      );
      return !!p?.prepared_at;
    },
    [plans]
  );

  const handleMarkPrepared = useCallback(
    async (date: string, slot_type: string) => {
      setPreparingSlot(`${date}:${slot_type}`);
      try {
        const res = await fetch("/api/meal-plans/prepare", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot_type })
        });
        if (res.ok) {
          setPlans((prev) =>
            prev.map((p) =>
              p.date === date && p.slot_type === slot_type
                ? { ...p, prepared_at: new Date().toISOString() }
                : p
            )
          );
        }
      } finally {
        setPreparingSlot(null);
      }
    },
    []
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const id = e.active.id as string;
    const dish = dishes.find((d) => d.id === id);
    if (dish) setActiveDish(dish);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDish(null);
    const dishId = e.active.id as string;
    const over = e.over?.id;
    if (!over || typeof over !== "string") return;
    const [date, slot_type] = over.split(":");
    if (date && slot_type && SLOTS.includes(slot_type as (typeof SLOTS)[number])) {
      setSlot(date, slot_type, dishId);
    }
  };

  const prevWeek = () => {
    setWeekStart((d) => {
      const x = new Date(d);
      x.setDate(x.getDate() - 7);
      return x;
    });
  };

  const nextWeek = () => {
    setWeekStart((d) => {
      const x = new Date(d);
      x.setDate(x.getDate() + 7);
      return x;
    });
  };

  if (loading) {
    return (
      <section className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
         <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-200 border-t-orange-500 dark:border-stone-700 dark:border-t-orange-500" />
         <p className="text-sm font-medium text-stone-500 dark:text-stone-400">Loading your meals…</p>
      </section>
    );
  }

  return (
    <section className="space-y-8 pb-12">
      {/* Header + week nav */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            This week
          </h1>
          <p className="mt-2 text-base font-medium text-stone-500 dark:text-stone-400">
            Drag recipes into days. Build your <Link href="/shopping-list" className="text-orange-600 underline hover:no-underline dark:text-orange-400">grocery list.</Link>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-2xl glass-panel p-1 shadow-sm">
            <button
              type="button"
              onClick={prevWeek}
              className="group flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
              aria-label="Previous week"
            >
              <ChevronLeft className="h-5 w-5 text-stone-600 transition-transform group-hover:-translate-x-0.5 dark:text-stone-300" />
            </button>
            <span className="flex min-h-[44px] items-center px-4 text-sm font-bold text-stone-800 dark:text-stone-200">
              {weekStart.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short"
              })}{" "}
              – {new Date(weekDates[6] + "T12:00:00").toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short"
              })}
            </span>
            <button
              type="button"
              onClick={nextWeek}
              className="group flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
              aria-label="Next week"
            >
              <ChevronRight className="h-5 w-5 text-stone-600 transition-transform group-hover:translate-x-0.5 dark:text-stone-300" />
            </button>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Recipe strip */}
        <div className="sticky top-24 z-40 rounded-3xl glass-panel p-4 pb-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
              Your Recipes
            </h3>
            <Link href="/recipes" className="text-xs font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
              Manage →
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {dishes.length === 0 ? (
              <p className="py-3 text-sm font-medium text-stone-500 dark:text-stone-400">
                You haven't added any recipes yet.{" "}
                <Link href="/recipes" className="text-orange-600 underline dark:text-orange-400">
                  Add one here.
                </Link>
              </p>
            ) : (
              dishes.map((d) => (
                <DraggableDish key={d.id} dish={d} />
              ))
            )}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="overflow-hidden rounded-[2.5rem] glass-panel shadow-sm">
          <div className="overflow-x-auto pb-2 scrollbar-thin">
            <table className="w-full min-w-[40rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200/50 dark:border-stone-700/50">
                  <th className="sticky left-0 z-20 min-w-[6rem] border-b border-r border-stone-200/50 bg-stone-50/50 p-4 text-xs font-bold uppercase tracking-widest text-stone-500 backdrop-blur-xl dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-400">
                    Day
                  </th>
                  {SLOTS.map((s) => {
                    const Icon = SLOT_ICONS[s];
                    return (
                      <th
                        key={s}
                        className="min-w-0 border-b border-stone-200/50 bg-stone-50/30 p-4 text-xs font-bold uppercase tracking-widest text-stone-600 dark:border-stone-700/50 dark:bg-stone-800/30 dark:text-stone-400 sm:min-w-[10rem]"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" aria-hidden />
                          {SLOT_LABELS[s]}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/50 dark:divide-stone-700/50">
                  {weekDates.map((date, rowIndex) => (
                  <tr
                    key={date}
                    className="group"
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 min-w-[6rem] border-r border-stone-200/50 bg-white/50 p-4 text-left backdrop-blur-xl transition-colors group-hover:bg-stone-50/80 dark:border-stone-700/50 dark:bg-stone-900/50 dark:group-hover:bg-stone-800/80"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-stone-900 dark:text-stone-50">
                          {new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                            weekday: "short",
                          })}
                        </span>
                        <span className="mt-0.5 text-xs font-semibold text-stone-500 dark:text-stone-400">
                           {new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short"
                          })}
                        </span>
                      </div>
                    </th>
                    {SLOTS.map((slot) => (
                      <DroppableSlot
                        key={`${date}:${slot}`}
                        date={date}
                        slot={slot}
                        current={getSlotDish(date, slot) ?? null}
                        prepared={getSlotPrepared(date, slot)}
                        onClear={() => setSlot(date, slot, null)}
                        onMarkPrepared={() => handleMarkPrepared(date, slot)}
                        preparing={preparingSlot === `${date}:${slot}`}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DragOverlay dropAnimation={{
            duration: 250,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}>
          {activeDish ? (
            <div className="rotate-3 scale-105 rounded-full border-2 border-orange-400 bg-white px-5 py-2.5 text-sm font-bold text-stone-800 shadow-xl dark:border-orange-500 dark:bg-stone-800 dark:text-stone-100">
              {activeDish.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}
