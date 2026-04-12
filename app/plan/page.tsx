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
import { Sun, Utensils, Moon, CheckCircle2, X, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { isMealPast } from "@/lib/isMealPast";
import { getSupabaseClient } from "@/lib/supabaseBrowser";

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
      className={`shrink-0 cursor-grab rounded-full border px-4 py-2.5 text-[15px] font-semibold tracking-tight backdrop-blur-md transition-all active:scale-[0.98] active:cursor-grabbing ${
        isDragging
          ? "border-orange-400 bg-orange-100/80 text-orange-900 shadow-inner dark:border-orange-600 dark:bg-orange-900/60 dark:text-orange-100"
          : "border-stone-200/60 bg-white/60 text-stone-700 shadow-sm hover:border-orange-300 hover:bg-orange-50/80 hover:text-orange-900 hover:shadow-[0_4px_12px_rgb(0,0,0,0.05)] dark:border-stone-700/60 dark:bg-stone-800/60 dark:text-stone-200 dark:hover:border-orange-500/50 dark:hover:bg-stone-800/90 dark:hover:shadow-[0_4px_12px_rgb(0,0,0,0.2)]"
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
  onClear
}: {
  date: string;
  slot: string;
  current: { id: string; name: string; image_url?: string | null } | null;
  prepared: boolean;
  onClear: () => void;
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
        {current?.image_url && (
           <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 dark:opacity-20 blur-[1.5px] rounded-[1.1rem] transition-all"
              style={{ backgroundImage: `url(${current.image_url})` }}
           />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-white/40 to-white/70 dark:from-stone-900/80 dark:via-stone-900/50 dark:to-stone-900/80 rounded-[1.1rem]" />
        
        {current ? (
          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
                  <span
                    className={`min-w-0 flex-1 break-words text-sm font-semibold leading-tight ${
                      prepared ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-800 dark:text-stone-200"
                    }`}
                    title={current?.name}
                  >
                    {current?.id ? (
                      <Link href={`/dishes/${current.id}`} className="hover:underline hover:text-orange-700 dark:hover:text-orange-400">
                        {current.name}
                      </Link>
                    ) : (
                      current?.name
                    )}
                  </span>
              {prepared ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <button
                  type="button"
                  onClick={onClear}
                  className="shrink-0 -mr-1 -mt-1 rounded-full p-1.5 text-stone-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover/slot:opacity-100 dark:text-stone-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  aria-label="Clear slot"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {prepared && (
              <div className="mt-auto pt-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3 fill-emerald-100 dark:fill-emerald-900" />
                  Done
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative z-10 flex h-full items-center justify-center opacity-0 transition-opacity group-hover/slot:opacity-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300">
              Drop here
            </span>
          </div>
        )}
      </div>
    </td>
  );
}

type Dish = { 
  id: string; 
  name: string;
  meal_type?: string | null;
  prep_time_minutes?: number | null;
  tags?: string[] | null;
  image_url?: string | null;
};
type PlanEntry = {
  id: string;
  date: string;
  slot_type: string;
  dish_id: string | null;
  dishes?: { id: string; name: string } | null;
};

const SLOTS = ["breakfast", "lunch", "dinner"] as const;
const FILTERS = ["All", "Breakfast", "Lunch", "Dinner", "Quick (<30m)"];

function formatDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  
  // State for mobile tappable slots
  const [mobileSlotOpen, setMobileSlotOpen] = useState<{date: string, slot: string} | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [dietFilter, setDietFilter] = useState<"Both" | "Veg" | "Non-Veg">("Both");
  const [hasSetInitialDiet, setHasSetInitialDiet] = useState(false);

  const filteredDishes = dishes.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (activeFilter === "Breakfast") matchesFilter = d.meal_type?.toLowerCase() === "breakfast";
    else if (activeFilter === "Lunch") matchesFilter = d.meal_type?.toLowerCase() === "lunch";
    else if (activeFilter === "Dinner") matchesFilter = d.meal_type?.toLowerCase() === "dinner";
    else if (activeFilter === "Quick (<30m)") matchesFilter = d.prep_time_minutes != null && d.prep_time_minutes < 30;

    let matchesDiet = true;
    if (dietFilter !== "Both") {
      const isVeg = d.tags?.some((t) => {
        const lower = t.toLowerCase();
        return lower === 'veg' || lower === 'vegetarian';
      }) ?? false;
      
      if (dietFilter === "Veg") matchesDiet = isVeg;
      if (dietFilter === "Non-Veg") matchesDiet = !isVeg;
    }

    return matchesSearch && matchesFilter && matchesDiet;
  });

  const weekDates = getWeekDates(weekStart);
  const from = weekDates[0];
  const to = weekDates[6];

  useEffect(() => {
    (async () => {
      const [dishesRes, plansRes, supabase] = await Promise.all([
        fetch("/api/dishes"),
        fetch(`/api/meal-plans?from=${from}&to=${to}`),
        getSupabaseClient()
      ]);
      const { data: { user } } = await supabase.auth.getUser();
      if (!hasSetInitialDiet && user?.user_metadata?.isVegetarianOnly) {
         setDietFilter("Veg");
         setHasSetInitialDiet(true);
      }
      if (dishesRes.ok) setDishes((await dishesRes.json()) ?? []);
      if (plansRes.ok) setPlans((await plansRes.json()) ?? []);
      setLoading(false);
    })();
  }, [from, to, hasSetInitialDiet]);

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
      if (p?.dish_id) {
         const d = dishes.find((d) => d.id === p.dish_id);
         if (d) return { id: d.id, name: d.name, image_url: d.image_url };
      }
      if (p?.dishes?.id && p?.dishes?.name) {
         return { id: p.dishes.id, name: p.dishes.name };
      }
      return null;
    },
    [plans, dishes]
  );

  const getSlotPrepared = useCallback(
    (date: string, slot_type: string) => {
      const p = plans.find(
        (x) => x.date === date && x.slot_type === slot_type
      );
      if (!p || (!p.dish_id && !p.dishes?.name)) return false;
      return isMealPast(date, slot_type);
    },
    [plans]
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
    <section className="space-y-4 pb-12 pt-4">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Desktop Only: Sticky Main Bar */}
        <div className="hidden sm:block sticky top-24 z-40 rounded-3xl glass-panel p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
          {/* Top Row: Date nav & Recipe search/action */}
          <div className="mb-4 flex items-center justify-between gap-4">
            
            {/* Left side: Date control */}
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-2xl p-1 shadow-inner bg-stone-100/80 dark:bg-stone-800/80">
                <button
                  type="button"
                  onClick={prevWeek}
                  className="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="h-4 w-4 text-stone-600 transition-transform group-hover:-translate-x-0.5 dark:text-stone-300" />
                </button>
                <span className="flex min-h-[40px] items-center px-4 text-sm font-bold text-stone-800 dark:text-stone-200">
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
                  className="group flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl transition-colors hover:bg-stone-200/50 dark:hover:bg-stone-700/50"
                  aria-label="Next week"
                >
                  <ChevronRight className="h-4 w-4 text-stone-600 transition-transform group-hover:translate-x-0.5 dark:text-stone-300" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWeekStart(getWeekStart(new Date()))}
                  className="rounded-xl border border-stone-200 bg-white/70 px-4 py-2.5 text-sm font-bold tracking-tight text-stone-700 hover:bg-stone-50 shadow-sm transition-all active:scale-95 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Date();
                    next.setDate(next.getDate() + 7);
                    setWeekStart(getWeekStart(next));
                  }}
                  className="rounded-xl border border-stone-200 bg-white/70 px-4 py-2.5 text-sm font-bold tracking-tight text-stone-700 hover:bg-stone-50 shadow-sm transition-all active:scale-95 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-200 dark:hover:bg-stone-700"
                >
                  Next Week
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4 flex-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400 whitespace-nowrap">
                Your Recipes
              </h3>
              
              <div className="relative max-w-xs flex-1 transition-all focus-within:max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search recipes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-stone-200/60 bg-stone-100/50 py-2 pl-9 pr-8 text-sm text-stone-800 placeholder:text-stone-400 focus:border-orange-400/50 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 dark:border-stone-700/50 dark:bg-stone-800/50 dark:text-stone-200 dark:focus:border-orange-500/50 dark:focus:bg-stone-900 transition-all shadow-inner"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>

            <Link href="/recipes" className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors">
              Manage →
            </Link>
          </div>

          {/* Desktop Filters & Diet */}
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-[14px] font-bold tracking-tight transition-all active:scale-95 border ${
                    activeFilter === f
                      ? "bg-stone-800 text-white border-stone-800 dark:bg-stone-200 dark:text-stone-900 border-none shadow-sm"
                      : "bg-transparent border-stone-200/60 text-stone-600 hover:bg-stone-100/50 hover:border-stone-300 dark:border-stone-700/60 dark:text-stone-400 dark:hover:bg-stone-800/50"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center rounded-full bg-stone-100/80 p-1 dark:bg-stone-800/80 shadow-inner shrink-0 hidden lg:flex">
              {(["Both", "Veg", "Non-Veg"] as const).map((diet) => (
                <button
                  key={diet}
                  onClick={() => setDietFilter(diet)}
                  className={`px-3 py-1.5 text-[13px] font-bold rounded-full transition-all active:scale-[0.98] ${
                    dietFilter === diet 
                      ? diet === "Veg" ? "bg-emerald-500 text-white shadow-sm" : diet === "Non-Veg" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-stone-800 shadow-sm dark:bg-stone-700 dark:text-stone-100"
                      : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                  }`}
                >
                  {diet}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide py-1">
            {dishes.length === 0 ? (
              <div className="flex w-full items-center justify-center py-4 rounded-2xl bg-stone-50 border border-dashed border-stone-200 dark:bg-stone-900/30 dark:border-stone-800">
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  You haven't added any recipes yet.{" "}
                  <Link href="/recipes" className="text-orange-600 font-semibold hover:underline dark:text-orange-400">
                    Add one here.
                  </Link>
                </p>
              </div>
            ) : filteredDishes.length === 0 ? (
              <div className="flex w-full items-center justify-center py-4">
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                  No recipes found for "{searchQuery}"
                </p>
              </div>
            ) : (
              filteredDishes.map((d) => (
                <DraggableDish key={d.id} dish={d} />
              ))
            )}
          </div>
        </div>

        {/* Desktop Only: Calendar Grid */}
        <div className="hidden sm:block overflow-hidden rounded-[2.5rem] glass-panel shadow-sm mt-4">
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
                  {weekDates.map((date) => (
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
            <div className="rotate-3 scale-105 overflow-hidden flex items-center justify-center rounded-2xl border-2 border-orange-400 bg-white/80 backdrop-blur-md shadow-2xl dark:border-orange-500 dark:bg-stone-800/80 w-40 h-24 relative group">
              {activeDish.image_url && (
                <div 
                   className="absolute inset-0 bg-cover bg-center opacity-40 blur-[2px] transition-all"
                   style={{ backgroundImage: `url(${activeDish.image_url})` }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="relative z-10 px-3 py-2 text-center">
                 <span className="text-sm font-bold text-white drop-shadow-md line-clamp-2 leading-tight">
                   {activeDish.name}
                 </span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Mobile Only: Vertical Stacked Designer List */}
      <div className="sm:hidden flex flex-col gap-5 mt-2">
        {weekDates.map((date) => (
          <div key={date} className="flex flex-col overflow-hidden rounded-[2rem] glass-panel bg-white/60 dark:bg-stone-900/40 outline outline-1 outline-stone-200/60 dark:outline-stone-700/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-stone-200/40 dark:border-stone-700/40">
              <div className="flex items-end gap-2 text-stone-900 dark:text-stone-50">
                <h4 className="text-2xl font-extrabold tracking-tight">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long" })}
                </h4>
                <p className="text-[13px] font-semibold text-stone-400 dark:text-stone-500 mb-1">
                  {new Date(date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
                </p>
              </div>
            </div>
            <div className="px-4 py-4 pb-5 space-y-3">
              {SLOTS.map((slot) => {
                 const Icon = SLOT_ICONS[slot];
                 const dishName = getSlotDish(date, slot);
                 const isPrepared = getSlotPrepared(date, slot);

                 return (
                   <div key={slot} className="relative flex items-center gap-3">
                     <div className={`flex w-[42px] h-[42px] shrink-0 items-center justify-center rounded-[0.95rem] ring-1 bg-white dark:bg-stone-800 ${isPrepared ? 'text-emerald-500 ring-emerald-200 dark:text-emerald-400 dark:ring-emerald-800/50' : 'text-stone-400 dark:text-stone-500 ring-stone-200/80 dark:ring-stone-700/80'} shadow-sm`}>
                       <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                     </div>
                     
                     <div className="flex-1 min-w-0">
                       {!dishName ? (
                         <button 
                           type="button" 
                           onClick={() => setMobileSlotOpen({ date, slot })}
                           className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl bg-stone-100/50 hover:bg-orange-50 dark:bg-stone-800/50 dark:hover:bg-orange-900/30 text-stone-500 transition-colors border border-dashed border-stone-300 dark:border-stone-700/60 font-semibold text-[13px] active:scale-[0.98]"
                         >
                           <Plus className="h-4 w-4" strokeWidth={3} /> Add {SLOT_LABELS[slot]}
                         </button>
                       ) : (
                         <div className={`flex h-[46px] items-center justify-between gap-2 rounded-xl border px-3.5 transition-colors ${isPrepared ? 'bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30' : 'bg-white/90 dark:bg-stone-800/90 border-stone-200/80 dark:border-stone-700/80 shadow-sm'}`}>
                           <span className={`truncate text-[14px] font-bold tracking-tight ${isPrepared ? 'text-stone-400 dark:text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600' : 'text-stone-800 dark:text-stone-200'}`}>
                             {dishName.id ? <Link href={`/dishes/${dishName.id}`} className="hover:underline">{dishName.name}</Link> : dishName.name}
                           </span>
                           {isPrepared ? (
                             <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
                           ) : (
                             <button
                               type="button"
                               onClick={() => setSlot(date, slot, null)}
                               className="shrink-0 -mr-1.5 rounded-full p-1.5 text-stone-400 transition-all hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-red-500 active:scale-95"
                               aria-label="Remove recipe"
                             >
                               <X className="h-4 w-4" strokeWidth={2.5} />
                             </button>
                           )}
                         </div>
                       )}
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Recipe Selection Bottom Sheet/Modal */}
      {mobileSlotOpen && (
        <div className="sm:hidden fixed inset-0 z-[200] flex flex-col justify-end bg-stone-900/40 backdrop-blur-sm dark:bg-black/80 transition-opacity outline-none animate-in fade-in duration-200 pb-[env(safe-area-inset-bottom)]">
          {/* Close backdrop hit area */}
          <div className="absolute inset-0 z-0" onClick={() => {
            setSearchQuery("");
            setActiveFilter("All");
            setMobileSlotOpen(null);
          }} />
          
          <div className="relative z-10 flex max-h-[90vh] min-h-[60vh] flex-col rounded-t-[2.5rem] bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-xl border-t border-stone-200 dark:border-stone-800 animate-in slide-in-from-bottom-8 duration-300 shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
            
            {/* Sheet Handle */}
            <div className="w-full flex justify-center pt-3 pb-1">
               <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
            </div>

            <div className="px-6 flex items-center justify-between mb-4 mt-2">
              <div>
                <h3 className="text-[28px] font-extrabold tracking-tight text-stone-900 dark:text-stone-50">
                  Select Recipe
                </h3>
                <p className="text-[15px] font-semibold text-stone-500 dark:text-stone-400 empty:hidden">
                  {SLOT_LABELS[mobileSlotOpen.slot]} · {new Date(mobileSlotOpen.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
              <button 
                 onClick={() => {
                   setSearchQuery("");
                   setActiveFilter("All");
                   setMobileSlotOpen(null);
                 }} 
                 className="rounded-full bg-stone-200/80 p-2 text-stone-600 hover:bg-stone-300 dark:bg-stone-800/80 dark:text-stone-300 dark:hover:bg-stone-700 transition-colors shrink-0"
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>

            {/* Sticky Search & Filter Header */}
            <div className="px-6 pb-2 sticky top-0 z-10 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-xl pt-2">
               <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" strokeWidth={2.5} />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border-none bg-stone-200/60 dark:bg-stone-800/60 py-3 pl-[42px] pr-10 text-[17px] font-medium text-stone-900 placeholder:text-stone-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:text-stone-100 dark:focus:bg-stone-900 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-stone-300 p-1 text-stone-600 dark:bg-stone-700 dark:text-stone-300"
                    >
                      <X className="h-3 w-3" strokeWidth={3} />
                    </button>
                  )}
               </div>
               
               {/* Mobile Filters */}
                 <div className="flex flex-col gap-3 pb-2 -mx-2 px-2">
                 <div className="flex items-center rounded-full bg-stone-200/50 p-1 dark:bg-stone-800/80 shadow-inner w-full">
                   {(["Both", "Veg", "Non-Veg"] as const).map((diet) => (
                     <button
                       key={diet}
                       onClick={() => setDietFilter(diet)}
                       className={`flex-1 px-3 py-2 text-[14px] font-bold rounded-full transition-all active:scale-[0.98] ${
                         dietFilter === diet 
                           ? diet === "Veg" ? "bg-emerald-500 text-white shadow-sm" : diet === "Non-Veg" ? "bg-rose-600 text-white shadow-sm" : "bg-white text-stone-800 shadow-sm dark:bg-stone-700 dark:text-stone-100"
                           : "text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
                       }`}
                     >
                       {diet}
                     </button>
                   ))}
                 </div>
                 <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                   {FILTERS.map((f) => (
                     <button
                       key={f}
                       onClick={() => setActiveFilter(f)}
                       className={`shrink-0 rounded-full px-4 py-1.5 text-[14px] font-bold tracking-tight transition-all active:scale-95 border ${
                         activeFilter === f
                           ? "bg-stone-800 text-white border-stone-800 dark:bg-stone-200 dark:text-stone-900 border-none shadow-sm"
                           : "bg-transparent border-stone-200/60 text-stone-500 hover:bg-stone-100/50 hover:border-stone-300 dark:border-stone-700/60 dark:text-stone-400 dark:hover:bg-stone-800/50 dark:hover:border-stone-600/80"
                       }`}
                     >
                       {f}
                     </button>
                   ))}
                 </div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 pb-12 space-y-2.5 scrollbar-hide">
              {dishes.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 opacity-70">
                    <Utensils className="h-12 w-12 text-stone-300 dark:text-stone-600 mb-4" />
                    <p className="text-[17px] font-bold text-stone-500 dark:text-stone-400">No recipes available.</p>
                 </div>
              ) : filteredDishes.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-12 opacity-70">
                    <Search className="h-12 w-12 text-stone-300 dark:text-stone-600 mb-4" strokeWidth={2} />
                    <p className="text-[17px] font-bold text-stone-500 dark:text-stone-400">No recipes found.</p>
                 </div>
              ) : (
                 filteredDishes.map((dish) => (
                   <button
                     key={dish.id}
                     type="button"
                     onClick={() => {
                        setSlot(mobileSlotOpen.date, mobileSlotOpen.slot, dish.id);
                        setSearchQuery("");
                        setMobileSlotOpen(null);
                     }}
                     className="group flex w-full items-center justify-between gap-4 rounded-[1.5rem] border-none bg-white px-5 py-4 text-left shadow-sm active:scale-[0.97] active:bg-orange-50 transition-all dark:bg-stone-900 dark:active:bg-orange-950/40"
                   >
                     <span className="truncate text-[17px] font-bold tracking-tight text-stone-800 dark:text-stone-200 group-active:text-orange-700 dark:group-active:text-orange-400">{dish.name}</span>
                     <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 group-active:bg-orange-200 dark:group-active:bg-orange-900/50 group-active:text-orange-600 dark:group-active:text-orange-400 transition-colors"><Plus className="h-5 w-5" strokeWidth={3} /></div>
                   </button>
                 ))
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
