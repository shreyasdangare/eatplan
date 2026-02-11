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

function DraggableDish({ dish }: { dish: Dish }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: dish.id
  });
  return (
    <li
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded bg-white px-2 py-1.5 text-xs shadow-sm active:cursor-grabbing"
    >
      {dish.name}
    </li>
  );
}

function DroppableSlot({
  date,
  slot,
  current,
  onClear
}: {
  date: string;
  slot: string;
  current: string | null;
  onClear: () => void;
}) {
  const slotId = `${date}:${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotId });

  return (
    <td className="min-w-[80px] border border-orange-200 bg-white p-1 align-top">
      <div
        ref={setNodeRef}
        className={`min-h-[36px] rounded border border-dashed p-1 ${
          isOver ? "border-orange-500 bg-orange-100" : "border-orange-200 bg-orange-50/50"
        }`}
      >
        {current ? (
          <span className="flex items-center justify-between gap-1">
            <span className="truncate">{current}</span>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 text-amber-600 hover:text-red-600"
              aria-label="Clear slot"
            >
              ×
            </button>
          </span>
        ) : (
          <span className="text-amber-500">—</span>
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
    if (date && slot_type && SLOTS.includes(slot_type as any)) {
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
      <section className="space-y-4">
        <p className="text-sm text-amber-700">Loading plan…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-amber-900">
            Weekly plan
          </h2>
          <p className="text-xs text-amber-700">
            Drag dishes onto a day and meal slot.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-orange-400"
        >
          Home
        </Link>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <button
          type="button"
          onClick={prevWeek}
          className="rounded-full bg-orange-100 px-3 py-1 text-amber-900 hover:bg-orange-200"
        >
          Previous week
        </button>
        <span className="text-amber-800">
          {weekStart.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short"
          })}{" "}
          – {weekDates[6]}
        </span>
        <button
          type="button"
          onClick={nextWeek}
          className="rounded-full bg-orange-100 px-3 py-1 text-amber-900 hover:bg-orange-200"
        >
          Next week
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-8">
          <div className="rounded-lg border border-orange-200 bg-orange-50/80 p-2 md:col-span-1">
            <p className="mb-2 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
              Recipes
            </p>
            <ul className="space-y-1">
              {dishes.map((d) => (
                <DraggableDish key={d.id} dish={d} />
              ))}
            </ul>
          </div>

          <div className="overflow-x-auto md:col-span-7">
            <table className="w-full min-w-[400px] border-collapse text-xs">
              <thead>
                <tr>
                  <th className="border border-orange-200 bg-orange-100 p-1 text-left font-semibold text-amber-900">
                    Day
                  </th>
                  {SLOTS.map((s) => (
                    <th
                      key={s}
                      className="border border-orange-200 bg-orange-100 p-1 capitalize text-amber-900"
                    >
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDates.map((date) => (
                  <tr key={date}>
                    <td className="border border-orange-200 bg-orange-50/50 p-1 font-medium text-amber-900">
                      {new Date(date + "Z").toLocaleDateString("en-GB", {
                        weekday: "short",
                        day: "numeric"
                      })}
                    </td>
                    {SLOTS.map((slot) => (
                      <DroppableSlot
                        key={`${date}:${slot}`}
                        date={date}
                        slot={slot}
                        current={getSlotDish(date, slot) ?? null}
                        onClear={() => setSlot(date, slot, null)}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DragOverlay>
          {activeDish ? (
            <div className="rounded bg-white px-3 py-2 text-sm shadow-lg">
              {activeDish.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="text-[11px] text-amber-700">
        Tip: drag a dish from the list and drop it on a meal slot. Use × to
        clear. Generate a{" "}
        <Link href="/shopping-list" className="underline">
          shopping list
        </Link>{" "}
        from your planned dishes.
      </p>
    </section>
  );
}
