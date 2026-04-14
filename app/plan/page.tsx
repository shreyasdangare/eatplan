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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sun, Utensils, Moon, CheckCircle2, X, ChevronLeft, ChevronRight, Plus, Search, GripVertical } from "lucide-react";
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

/* ─── Draggable pill (recipe tray) ─── */
function DraggableDish({ dish }: { dish: Dish }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tray:${dish.id}`
  });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group/tray relative shrink-0 cursor-grab overflow-hidden rounded-full border w-[150px] h-[46px] text-[16px] font-bold transition-all active:scale-[0.98] active:cursor-grabbing ${
        isDragging
          ? "border-orange-400 ring-2 ring-orange-400 shadow-xl opacity-0"
          : "border-stone-200/60 shadow-sm hover:border-orange-300 hover:shadow-md dark:border-stone-700/60"
      }`}
    >
      {/* Blurred background image */}
      {dish.image_url && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 blur-[2px] transition-all group-hover/tray:opacity-50 group-hover/tray:blur-[1px]" 
          style={{ backgroundImage: `url(${dish.image_url})` }}
        />
      )}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-md dark:bg-stone-900/70" />
      <span className="relative z-10 block truncate px-4 text-stone-700 dark:text-stone-200 group-hover/tray:text-orange-900 dark:group-hover/tray:text-orange-300">
        {dish.name}
      </span>
    </button>
  );
}

/* ─── Sortable dish pill inside a slot ─── */
function SortableDishPill({
  entry,
  prepared,
  onRemove,
}: {
  entry: PlanEntry;
  prepared: boolean;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const dishName = entry.dishes?.name ?? "Unknown";
  const dishId = entry.dishes?.id ?? entry.dish_id;
  const imageUrl = entry.dishes?.image_url;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/pill relative flex items-center gap-1.5 overflow-hidden rounded-xl border px-3 py-2 transition-all ${
        prepared
          ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30"
          : "bg-white/90 dark:bg-stone-800/90 border-stone-200/80 dark:border-stone-700/80 shadow-sm"
      }`}
    >
      {/* Blurred background image if not prepared */}
      {!prepared && imageUrl && (
        <>
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-[0.15] blur-[3px] transition-all group-hover/pill:opacity-[0.25]"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 bg-white/60 dark:bg-stone-900/60" />
        </>
      )}

      {/* Drag handle */}
      {!prepared && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="relative z-10 shrink-0 cursor-grab rounded p-0.5 text-stone-400 hover:text-stone-600 active:cursor-grabbing dark:text-stone-500 dark:hover:text-stone-300 touch-none"
          aria-label="Reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <span
        className={`relative z-10 min-w-0 flex-1 truncate text-[15px] font-bold tracking-tight ${
          prepared
            ? "text-stone-400 dark:text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600"
            : "text-stone-800 dark:text-stone-200"
        }`}
        title={dishName}
      >
        {dishId ? (
          <Link href={`/dishes/${dishId}`} className="hover:underline hover:text-orange-700 dark:hover:text-orange-400">
            {dishName}
          </Link>
        ) : (
          dishName
        )}
      </span>

      {prepared ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
      ) : (
        <button
          type="button"
          onClick={onRemove}
          className="relative z-10 shrink-0 rounded-full p-1 text-stone-400 opacity-0 transition-all hover:bg-red-100/80 hover:text-red-600 group-hover/pill:opacity-100 dark:text-stone-500 dark:hover:bg-red-900/40 dark:hover:text-red-400"
          aria-label="Remove"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Inline type-to-add search ─── */
function InlineAddDish({
  dishes,
  onSelect,
  onClose,
}: {
  dishes: Dish[];
  onSelect: (dishId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = dishes.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative mt-1">
      <div className="flex items-center gap-1.5 rounded-lg border border-orange-300/60 bg-white dark:bg-stone-900 dark:border-orange-600/40 px-2.5 py-1.5 shadow-sm">
        <Search className="h-3.5 w-3.5 text-stone-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered.length === 1) {
              onSelect(filtered[0].id);
            }
          }}
          placeholder="Type recipe name…"
          className="flex-1 bg-transparent text-sm font-medium text-stone-800 placeholder:text-stone-400 outline-none dark:text-stone-200 min-w-0"
        />
        <button onClick={onClose} className="shrink-0 rounded-full p-0.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {query && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900 scrollbar-hide">
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-stone-400">No recipes found</p>
          ) : (
            filtered.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-stone-700 hover:bg-orange-50 dark:text-stone-300 dark:hover:bg-orange-900/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span className="truncate">{d.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Droppable slot (table cell) ─── */
function DroppableSlot({
  date,
  slot,
  entries,
  dishes,
  onAddDish,
  onRemoveDish,
  onReorder,
}: {
  date: string;
  slot: string;
  entries: PlanEntry[];
  dishes: Dish[];
  onAddDish: (date: string, slot: string, dishId: string) => void;
  onRemoveDish: (planId: string) => void;
  onReorder: (date: string, slot: string, orderedIds: string[]) => void;
}) {
  const slotId = `${date}:${slot}`;
  const { setNodeRef, isOver } = useDroppable({ id: slotId });
  const [showInlineAdd, setShowInlineAdd] = useState(false);

  const allPrepared = entries.length > 0 && entries.every((e) => isMealPast(date, slot));

  return (
    <td className="min-w-[10rem] border-b border-stone-200/50 p-2 align-top dark:border-stone-700/50 group/slot">
      <div
        ref={setNodeRef}
        className={`relative flex min-h-[5.5rem] flex-col rounded-[1.25rem] border-2 p-2.5 transition-all duration-300 ${
          isOver
            ? "scale-[1.02] border-orange-400 bg-orange-50 shadow-md dark:border-orange-500/80 dark:bg-orange-900/30"
            : allPrepared && entries.length > 0
            ? "border-emerald-300/80 bg-emerald-50/80 dark:border-emerald-700/80 dark:bg-emerald-950/40"
            : "border-dashed border-stone-200/60 bg-stone-50/40 hover:border-stone-300 dark:border-stone-700/60 dark:bg-stone-800/30 dark:hover:border-stone-600"
        }`}
      >
        {entries.length > 0 ? (
          <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1.5 relative z-10">
              {entries.map((entry) => (
                <SortableDishPill
                  key={entry.id}
                  entry={entry}
                  prepared={isMealPast(date, slot)}
                  onRemove={() => onRemoveDish(entry.id)}
                />
              ))}
            </div>
          </SortableContext>
        ) : !showInlineAdd ? (
          <div className="relative z-10 flex h-full items-center justify-center opacity-0 transition-opacity group-hover/slot:opacity-100">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
              Drop here
            </span>
          </div>
        ) : null}

        {/* Add more button / inline search */}
        {!allPrepared && entries.length < 5 && (
          <div className="mt-1.5 relative z-10">
            {showInlineAdd ? (
              <InlineAddDish
                dishes={dishes}
                onSelect={(dishId) => {
                  onAddDish(date, slot, dishId);
                  setShowInlineAdd(false);
                }}
                onClose={() => setShowInlineAdd(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowInlineAdd(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold text-stone-400 opacity-0 transition-all hover:bg-orange-50 hover:text-orange-600 group-hover/slot:opacity-100 dark:hover:bg-orange-900/20 dark:hover:text-orange-400 dark:text-stone-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
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
  position: number;
  dishes?: { id: string; name: string, image_url?: string | null } | null;
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

  /* ─── Slot helpers ─── */
  const getSlotEntries = useCallback(
    (date: string, slot_type: string) => {
      return plans
        .filter((x) => x.date === date && x.slot_type === slot_type)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    },
    [plans]
  );

  const addDishToSlot = useCallback(
    async (date: string, slot_type: string, dish_id: string) => {
      const existing = plans.filter((p) => p.date === date && p.slot_type === slot_type);
      if (existing.length >= 5) return; // Max 5

      const dish = dishes.find((d) => d.id === dish_id);
      const nextPosition = existing.length > 0
        ? Math.max(...existing.map((e) => e.position ?? 0)) + 1
        : 0;

      const tempId = crypto.randomUUID();
      const newEntry: PlanEntry = {
        id: tempId,
        date,
        slot_type,
        dish_id,
        position: nextPosition,
        dishes: dish ? { id: dish.id, name: dish.name } : null,
      };

      setPlans((prev) => [...prev, newEntry]);

      try {
        const res = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot_type, dish_id }),
        });
        if (!res.ok) throw new Error("Failed to add dish");
        // Refetch to get real IDs
        const plansRes = await fetch(`/api/meal-plans?from=${from}&to=${to}`);
        if (plansRes.ok) setPlans((await plansRes.json()) ?? []);
      } catch (err) {
        console.error("Add dish failed:", err);
        setPlans((prev) => prev.filter((p) => p.id !== tempId));
      }
    },
    [dishes, plans, from, to]
  );

  const removeDishFromSlot = useCallback(
    async (planId: string) => {
      const previousPlans = plans;
      setPlans((prev) => prev.filter((p) => p.id !== planId));

      try {
        const res = await fetch(`/api/meal-plans?id=${planId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to remove dish");
      } catch (err) {
        console.error("Remove dish failed:", err);
        setPlans(previousPlans);
      }
    },
    [plans]
  );

  const clearSlot = useCallback(
    async (date: string, slot_type: string) => {
      const previousPlans = plans;
      setPlans((prev) => prev.filter((p) => !(p.date === date && p.slot_type === slot_type)));

      try {
        const res = await fetch("/api/meal-plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot_type, dish_id: null }),
        });
        if (!res.ok) throw new Error("Failed to clear slot");
      } catch (err) {
        console.error("Clear slot failed:", err);
        setPlans(previousPlans);
      }
    },
    [plans]
  );

  const reorderSlot = useCallback(
    async (date: string, slot_type: string, orderedIds: string[]) => {
      // Optimistic: re-assign positions
      setPlans((prev) => {
        const rest = prev.filter((p) => !(p.date === date && p.slot_type === slot_type));
        const slotEntries = prev.filter((p) => p.date === date && p.slot_type === slot_type);
        const reordered = orderedIds.map((id, i) => {
          const entry = slotEntries.find((e) => e.id === id);
          return entry ? { ...entry, position: i } : null;
        }).filter(Boolean) as PlanEntry[];
        return [...rest, ...reordered];
      });

      try {
        await fetch("/api/meal-plans", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date, slot_type, ordered_ids: orderedIds }),
        });
      } catch (err) {
        console.error("Reorder failed:", err);
      }
    },
    []
  );

  /* ─── DnD ─── */
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    const rawId = e.active.id as string;
    if (rawId.startsWith("tray:")) {
      const dishId = rawId.replace("tray:", "");
      const dish = dishes.find((d) => d.id === dishId);
      if (dish) setActiveDish(dish);
    }
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDish(null);
    const rawActiveId = e.active.id as string;
    const over = e.over?.id;
    if (!over || typeof over !== "string") return;

    // Case 1: Dragging from tray to slot
    if (rawActiveId.startsWith("tray:")) {
      const dishId = rawActiveId.replace("tray:", "");
      const [date, slot_type] = (over as string).split(":");
      if (date && slot_type && SLOTS.includes(slot_type as (typeof SLOTS)[number])) {
        addDishToSlot(date, slot_type, dishId);
      }
      return;
    }

    // Case 2: Moving or Reordering existing plan entries
    const activeId = rawActiveId;
    const overId = over as string;
    
    if (activeId === overId) return;

    const activeEntry = plans.find((p) => p.id === activeId);
    if (!activeEntry) return;

    // Check if we dropped on another entry
    const overEntry = plans.find((p) => p.id === overId);
    
    if (overEntry) {
      if (activeEntry.date === overEntry.date && activeEntry.slot_type === overEntry.slot_type) {
        // Reordering within the SAME slot
        const slotEntries = getSlotEntries(activeEntry.date, activeEntry.slot_type);
        const oldIndex = slotEntries.findIndex((e) => e.id === activeId);
        const newIndex = slotEntries.findIndex((e) => e.id === overId);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(slotEntries, oldIndex, newIndex);
          reorderSlot(activeEntry.date, activeEntry.slot_type, newOrder.map((e) => e.id));
        }
      } else {
        // Moving to a DIFFERENT slot (and specifically onto another item)
        updateEntrySlotView(activeId, overEntry.date, overEntry.slot_type);
      }
    } else if (overId.includes(":")) {
      // Dropped on a Slot background
      const [date, slot_type] = overId.split(":");
      if (date && slot_type && (activeEntry.date !== date || activeEntry.slot_type !== slot_type)) {
        updateEntrySlotView(activeId, date, slot_type);
      }
    }
  };

  const updateEntrySlotView = useCallback(async (planId: string, date: string, slot_type: string) => {
    // Optimistic UI update
    const previousPlans = [...plans];
    setPlans(prev => prev.map(p => p.id === planId ? { ...p, date, slot_type, position: 999 } : p));

    try {
      const res = await fetch("/api/meal-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planId, date, slot_type }),
      });
      if (!res.ok) throw new Error("Move failed");
      
      // Full refetch to get correct positions
      const plansRes = await fetch(`/api/meal-plans?from=${from}&to=${to}`);
      if (plansRes.ok) setPlans((await plansRes.json()) ?? []);
    } catch (err) {
      console.error("Move failed:", err);
      setPlans(previousPlans);
    }
  }, [plans, from, to]);

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
                  No recipes found for &quot;{searchQuery}&quot;
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
                        entries={getSlotEntries(date, slot)}
                        dishes={filteredDishes}
                        onAddDish={addDishToSlot}
                        onRemoveDish={removeDishFromSlot}
                        onReorder={reorderSlot}
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
                 const entries = getSlotEntries(date, slot);
                 const allPrepared = entries.length > 0 && entries.every(() => isMealPast(date, slot));

                 return (
                   <div key={slot} className="flex gap-3">
                     <div className={`flex w-[42px] h-[42px] shrink-0 items-center justify-center rounded-[0.95rem] ring-1 bg-white dark:bg-stone-800 ${allPrepared ? 'text-emerald-500 ring-emerald-200 dark:text-emerald-400 dark:ring-emerald-800/50' : 'text-stone-400 dark:text-stone-500 ring-stone-200/80 dark:ring-stone-700/80'} shadow-sm mt-0.5`}>
                       <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                     </div>
                     
                     <div className="flex-1 min-w-0 space-y-1.5">
                       {entries.length > 0 ? (
                         <>
                           {entries.map((entry) => {
                             const dishName = entry.dishes?.name ?? "Unknown";
                             const dishId = entry.dishes?.id ?? entry.dish_id;
                             const isPrepared = isMealPast(date, slot);

                             return (
                               <div
                                 key={entry.id}
                                 className={`flex items-center justify-between gap-2 rounded-xl border px-3.5 h-[46px] transition-colors ${
                                   isPrepared
                                     ? "bg-emerald-50/50 border-emerald-200/50 dark:bg-emerald-950/20 dark:border-emerald-800/30"
                                     : "bg-white/90 dark:bg-stone-800/90 border-stone-200/80 dark:border-stone-700/80 shadow-sm"
                                 }`}
                               >
                                 <span
                                   className={`truncate text-[15px] font-bold tracking-tight ${
                                     isPrepared
                                       ? "text-stone-400 dark:text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600"
                                       : "text-stone-800 dark:text-stone-200"
                                   }`}
                                 >
                                   {dishId ? (
                                     <Link href={`/dishes/${dishId}`} className="hover:underline">
                                       {dishName}
                                     </Link>
                                   ) : (
                                     dishName
                                   )}
                                 </span>
                                 {isPrepared ? (
                                   <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
                                 ) : (
                                   <button
                                     type="button"
                                     onClick={() => removeDishFromSlot(entry.id)}
                                     className="shrink-0 -mr-1.5 rounded-full p-1.5 text-stone-400 transition-all hover:bg-stone-100 dark:hover:bg-stone-700 hover:text-red-500 active:scale-95"
                                     aria-label="Remove recipe"
                                   >
                                     <X className="h-4 w-4" strokeWidth={2.5} />
                                   </button>
                                 )}
                               </div>
                             );
                           })}
                         </>
                       ) : null}

                       {/* Add button (always show if under limit and not all prepared) */}
                       {!allPrepared && entries.length < 5 && (
                         <button 
                           type="button" 
                           onClick={() => setMobileSlotOpen({ date, slot })}
                           className="w-full h-[46px] flex items-center justify-center gap-2 rounded-xl bg-stone-100/50 hover:bg-orange-50 dark:bg-stone-800/50 dark:hover:bg-orange-900/30 text-stone-500 transition-colors border border-dashed border-stone-300 dark:border-stone-700/60 font-semibold text-[13px] active:scale-[0.98]"
                         >
                           <Plus className="h-4 w-4" strokeWidth={3} /> Add {SLOT_LABELS[slot]}
                         </button>
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
                        addDishToSlot(mobileSlotOpen.date, mobileSlotOpen.slot, dish.id);
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
