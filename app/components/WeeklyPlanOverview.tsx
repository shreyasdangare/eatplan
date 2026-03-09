import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import { Sun, Utensils, Moon, Plus, CheckCircle2, ChefHat, CalendarPlus } from "lucide-react";

export const dynamic = "force-dynamic";

type PlanEntry = {
  id: string;
  date: string;
  slot_type: "breakfast" | "lunch" | "dinner";
  prepared_at: string | null;
  dishes?: { id: string; name: string } | null;
};

const SLOT_ICONS = {
  breakfast: Sun,
  lunch: Utensils,
  dinner: Moon,
};

function getWeekDates(weekStart: Date) {
  const dates = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    dates.push({
      dateStr: d.toISOString().slice(0, 10),
      dayName: days[d.getDay()],
      monthDay: `${months[d.getMonth()]} ${d.getDate()}`,
      isToday: d.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10)
    });
  }
  return dates;
}

export async function WeeklyPlanOverview() {
  const supabase = supabaseServer;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  // Calculate current week (Mon-Sun)
  const todayDate = new Date();
  const day = todayDate.getDay();
  const diff = todayDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(todayDate);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);

  const weekDates = getWeekDates(monday);
  const startStr = weekDates[0].dateStr;
  const endStr = weekDates[6].dateStr;

  const { data: rawData, error } = await supabase
    .from("meal_plans")
    .select(`
      id, date, slot_type, prepared_at, dish_id,
      dishes ( id, name )
    `)
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch plan preview:", error);
    return null; /* Silently fail on UI, rely on logs */
  }

  const plans = (rawData || []) as unknown as PlanEntry[];
  
  // Group by date
  const planByDate: Record<string, Record<string, PlanEntry>> = {};
  weekDates.forEach((d) => {
    planByDate[d.dateStr] = {};
  });

  plans.forEach((p) => {
    if (planByDate[p.date]) {
      planByDate[p.date][p.slot_type] = p;
    }
  });

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50 leading-tight">
              This Week's Plan
            </h3>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {weekDates[0].monthDay} - {weekDates[6].monthDay}
            </p>
          </div>
        </div>
        <a
          href="/plan"
          className="group flex items-center gap-1.5 rounded-full bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700 dark:hover:text-stone-50"
        >
          View Planner
          <span className="transition-transform group-hover:translate-x-1">→</span>
        </a>
      </div>

      {/* Horizontal scrollable container for the 7 days */}
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide -mx-6 px-6 sm:mx-0 sm:px-0">
        {weekDates.map((dayData) => {
          const dayPlan = planByDate[dayData.dateStr] || {};
          const slots = ["breakfast", "lunch", "dinner"] as const;
          const hasAnyMeals = slots.some((s) => dayPlan[s]?.dishes);

          return (
            <div
              key={dayData.dateStr}
              className={`relative flex min-w-[260px] max-w-[280px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.5rem] glass-panel transition-all hover:-translate-y-1 hover:shadow-lg ${
                dayData.isToday
                  ? "ring-2 ring-orange-400/60 shadow-[0_8px_30px_rgba(234,88,12,0.15)] dark:ring-orange-500/50 dark:shadow-[0_8px_30px_rgba(234,88,12,0.2)]"
                  : "border border-stone-200/50 dark:border-stone-700/50"
              }`}
            >
              {dayData.isToday && (
                <div className="absolute top-0 w-full bg-gradient-to-r from-orange-400 to-amber-500 px-4 py-1 text-center text-xs font-bold tracking-wider text-white shadow-sm">
                  TODAY
                </div>
              )}
              
              <div className={`border-b border-stone-200/50 px-5 pb-3 pt-5 dark:border-stone-700/50 ${dayData.isToday ? 'mt-4' : ''}`}>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-stone-900 dark:text-stone-50">
                    {dayData.dayName}
                  </span>
                  <span className="text-sm font-medium text-stone-500 dark:text-stone-400">
                    {dayData.monthDay}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5">
                {slots.map((slot) => {
                  const entry = dayPlan[slot];
                  const Icon = SLOT_ICONS[slot];
                  const dishName = entry?.dishes?.name;
                  const isPrepared = !!entry?.prepared_at;

                  if (!dishName) return null;

                  return (
                    <div key={slot} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                        <Icon className="h-3.5 w-3.5" />
                        {slot}
                      </div>
                      <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 shadow-sm transition-colors ${
                        isPrepared 
                          ? "border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-800/30 dark:bg-emerald-950/20" 
                          : "border-stone-200/80 bg-white/60 dark:border-stone-700/80 dark:bg-stone-800/60"
                      }`}>
                        <div className="flex-1 text-sm font-medium leading-tight text-stone-800 dark:text-stone-200">
                          {dishName}
                        </div>
                        {isPrepared && (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
                        )}
                      </div>
                    </div>
                  );
                })}

                {!hasAnyMeals && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center opacity-70 transition-opacity hover:opacity-100">
                    <div className="rounded-full bg-stone-100 p-3 dark:bg-stone-800">
                      <CalendarPlus className="h-6 w-6 text-stone-400 dark:text-stone-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-600 dark:text-stone-300">Nothing planned</p>
                      <a href={`/plan?date=${dayData.dateStr}`} className="mt-1 inline-block text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                        Add a meal →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
