"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner"
};

const SLOT_ICONS: Record<string, string> = {
  breakfast: "☀️",
  lunch: "🍽",
  dinner: "🌙"
};

function DraggableDish({ dish }: { dish: Dish }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: dish.id
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="shrink-0 cursor-grab rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-900 active:cursor-grabbing"
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
    <td className="min-w-0 border-b border-stone-200/80 p-0 align-top sm:min-w-[7rem]">
      <div
        ref={setNodeRef}
        className={`relative min-h-[4.25rem] rounded-lg border-2 border-dashed p-2 transition-colors ${
          isOver
            ? "border-orange-400 bg-orange-50"
            : "border-stone-200 bg-stone-50/50 hover:border-stone-300"
        } ${prepared ? "border-lime-300/80 bg-lime-50/80" : ""}`}
      >
        {current ? (
          <div className="flex h-full flex-col gap-1">
            <div className="flex items-start justify-between gap-1">
              <span
                className={`min-w-0 flex-1 truncate text-xs font-medium ${
                  prepared ? "line-through text-stone-500" : "text-stone-800"
                }`}
                title={current}
              >
                {current}
              </span>
              <button
                type="button"
                onClick={onClear}
                className="shrink-0 rounded p-0.5 text-stone-400 hover:bg-stone-200 hover:text-red-600"
                aria-label="Clear slot"
              >
                ×
              </button>
            </div>
            {!prepared ? (
              <button
                type="button"
                disabled={preparing}
                onClick={onMarkPrepared}
                className="mt-auto text-[10px] font-medium text-lime-700 hover:underline disabled:opacity-50"
              >
                {preparing ? "…" : "Mark prepared"}
              </button>
            ) : (
              <span className="mt-auto text-[10px] font-medium text-lime-600">
                ✓ Prepared
              </span>
            )}
          </div>
        ) : (
          <span className="flex min-h-[2.5rem] items-center text-[11px] text-stone-400">
            Drop recipe
          </span>
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
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot_type, dish_id })
      });
      if (!res.ok) return;
      setPlans((prev) => {
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
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
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
      <section className="flex min-h-[12rem] items-center justify-center">
        <p className="text-sm text-stone-500">Loading plan…</p>
      </section>
    );
  }

  return (
    <section className="space-y-6 pb-8">
      {/* Header + week nav */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
            This week
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Drag recipes into slots. Mark prepared when done.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-stone-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={prevWeek}
              className="rounded-l-xl px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              aria-label="Previous week"
            >
              ←
            </button>
            <span className="border-x border-stone-200 px-4 py-2 text-sm font-medium text-stone-800">
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
              className="rounded-r-xl px-3 py-2 text-stone-600 hover:bg-stone-100 hover:text-stone-900"
              aria-label="Next week"
            >
              →
            </button>
          </div>
          <Link
            href="/"
            className="hidden rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 sm:inline-block"
          >
            Home
          </Link>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Recipe strip: horizontal scroll, scales to many dishes */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Recipes — drag into a slot below
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {dishes.length === 0 ? (
              <p className="py-2 text-xs text-stone-500">
                No recipes yet.{" "}
                <Link href="/recipes" className="font-medium text-orange-600 underline">
                  Add recipes
                </Link>
              </p>
            ) : (
              dishes.map((d) => (
                <DraggableDish key={d.id} dish={d} />
              ))
            )}
          </div>
        </div>

        {/* Grid: sticky header + sticky first column for large plans */}
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="sticky left-0 z-10 min-w-[5rem] border-b border-r border-stone-200 bg-stone-50 px-3 py-3 text-xs font-semibold uppercase tracking-wider text-stone-600">
                    Day
                  </th>
                  {SLOTS.map((s) => (
                    <th
                      key={s}
                      className="min-w-0 border-b border-stone-200 px-2 py-3 text-xs font-semibold uppercase tracking-wider text-stone-600 sm:min-w-[7rem] sm:px-3"
                    >
                      <span className="flex items-center gap-1.5">
                        <span aria-hidden>{SLOT_ICONS[s]}</span>
                        {SLOT_LABELS[s]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date, rowIndex) => (
                  <tr
                    key={date}
                    className={rowIndex % 2 === 1 ? "bg-stone-50/30" : undefined}
                  >
                    <th
                      scope="row"
                      className={`sticky left-0 z-10 min-w-[5rem] border-b border-r border-stone-200 px-3 py-2 text-left text-xs font-medium text-stone-800 ${
                        rowIndex % 2 === 1 ? "bg-stone-50/50" : "bg-white"
                      }`}
                    >
                      {new Date(date + "T12:00:00").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short"
                      })}
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

        <DragOverlay dropAnimation={null}>
          {activeDish ? (
            <div className="rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-lg">
              {activeDish.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-center text-xs text-stone-500">
        Build a{" "}
        <Link href="/shopping-list" className="font-medium text-orange-600 underline hover:text-orange-700">
          shopping list
        </Link>{" "}
        from your planned dishes.
      </p>
    </section>
  );
}
