import { getSession } from "@/lib/supabaseServerClient";
import { supabaseServer } from "@/lib/supabaseServer";
import { getHouseholdId } from "@/lib/getHouseholdId";
import Link from "next/link";
import { Sun, Utensils, Moon, Plus, CheckCircle2, ChefHat, CalendarPlus } from "lucide-react";

import { isMealPast } from "@/lib/isMealPast";

export const dynamic = "force-dynamic";

type PlanEntry = {
  id: string;
  date: string;
  slot_type: "breakfast" | "lunch" | "dinner";
  dishes?: { id: string; name: string; image_url?: string | null } | null;
};

const SLOT_ICONS = {
  breakfast: Sun,
  lunch: Utensils,
  dinner: Moon,
};

function getUpcomingDates() {
  const dates = [];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const today = new Date();
  for (let i = 0; i < 2; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push({
      dateStr: dateStr,
      dayName: i === 0 ? "Today" : "Tomorrow",
      monthDay: `${months[d.getMonth()]} ${d.getDate()}`,
      isToday: i === 0
    });
  }
  return dates;
}

export async function WeeklyPlanOverview() {
  const { user } = await getSession();
  if (!user) return null;

  const householdId = await getHouseholdId(user.id);
  if (!householdId) return null;

  const upcomingDates = getUpcomingDates();
  const startStr = upcomingDates[0].dateStr;
  const endStr = upcomingDates[1].dateStr;

  const { data: rawData, error } = await supabaseServer
    .from("meal_plans")
    .select(`
      id, date, slot_type, dish_id,
      dishes ( id, name, image_url )
    `)
    .eq("household_id", householdId)
    .gte("date", startStr)
    .lte("date", endStr)
    .order("date", { ascending: true });

  if (error) {
    console.error("Failed to fetch plan preview:", error);
    return null; /* Silently fail on UI, rely on logs */
  }

  const plans = (rawData || []) as unknown as PlanEntry[];
  
  const planByDate: Record<string, Record<string, PlanEntry>> = {};
  upcomingDates.forEach((d) => {
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
              Up Next
            </h3>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {upcomingDates[0].monthDay} & {upcomingDates[1].monthDay}
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

      {/* Horizontal scrollable container for the 2 days */}
      {/* Responsive Grid for Today and Tomorrow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-2">
        {upcomingDates.map((dayData) => {
          const dayPlan = planByDate[dayData.dateStr] || {};
          const slots = ["breakfast", "lunch", "dinner"] as const;
          const hasAnyMeals = slots.some((s) => dayPlan[s]?.dishes);

          return (
            <div
              key={dayData.dateStr}
              className={`relative flex flex-col overflow-hidden rounded-[2rem] glass-panel transition-all duration-300 hover:shadow-xl ${
                dayData.isToday
                  ? "bg-white/80 dark:bg-stone-800/80 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] ring-1 ring-orange-500/30 dark:ring-orange-500/40"
                  : "bg-white/40 dark:bg-stone-800/40 shadow-sm border border-stone-200/50 dark:border-stone-700/50 opacity-95 hover:opacity-100"
              }`}
            >
              {/* Card Header */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                <div>
                  <h4 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
                    {dayData.dayName}
                  </h4>
                  <p className={`text-sm font-medium mt-0.5 ${dayData.isToday ? "text-orange-600 dark:text-orange-400" : "text-stone-500 dark:text-stone-400"}`}>
                    {dayData.monthDay}
                  </p>
                </div>
                {dayData.isToday && (
                  <div className="flex h-2.5 w-2.5 rounded-full bg-orange-500 ring-4 ring-orange-500/20 dark:bg-orange-400 dark:ring-orange-400/20" />
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1 px-5 pb-5 flex flex-col">
                {hasAnyMeals ? (
                  <div className="flex flex-col overflow-hidden rounded-[1.5rem] bg-stone-50/80 dark:bg-stone-900/50 ring-1 ring-stone-200/60 dark:ring-stone-700/60 divide-y divide-stone-200/60 dark:divide-stone-700/60 shadow-inner">
                    {slots.map((slot) => {
                      const entry = dayPlan[slot];
                      if (!entry?.dishes?.name) return null;
                      
                      const Icon = SLOT_ICONS[slot];
                      const dishName = entry.dishes.name;
                      const isPrepared = isMealPast(dayData.dateStr, slot);

                      return (
                        <div key={slot} className="group relative overflow-hidden flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-stone-100/80 dark:hover:bg-stone-800/80">
                          {entry.dishes.image_url && (
                             <div 
                               className="absolute z-0 inset-0 bg-cover bg-center opacity-30 dark:opacity-20 blur-[1px] transition-all"
                               style={{ backgroundImage: `url(${entry.dishes.image_url})` }}
                             />
                          )}
                          {entry.dishes.image_url && (
                             <div className="absolute z-0 inset-0 bg-gradient-to-r from-stone-50/90 via-stone-50/60 to-stone-50/90 dark:from-stone-900/90 dark:via-stone-900/60 dark:to-stone-900/90" />
                          )}
                          {/* Left Icon Container */}
                          <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.85rem] bg-white shadow-sm ring-1 ring-stone-200/50 dark:bg-stone-800 dark:ring-stone-700/50 ${isPrepared ? 'text-emerald-500 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors'}`}>
                            <Icon className="h-5 w-5" strokeWidth={2.5} />
                          </div>
                          
                          <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-0.5">
                            <span className={`truncate text-[15px] font-semibold tracking-tight ${isPrepared ? 'text-stone-400 dark:text-stone-500 line-through decoration-stone-300 dark:decoration-stone-600' : 'text-stone-900 dark:text-stone-100'}`}>
                              <Link href={`/dishes/${entry.dishes.id}`} className="hover:underline hover:text-orange-600 dark:hover:text-orange-400">
                                {dishName}
                              </Link>
                            </span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 mt-0.5">
                              {slot}
                            </span>
                          </div>
                          
                          {/* Right Indicator */}
                          <div className="relative z-10">
                            {isPrepared ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400 shadow-sm rounded-full bg-white dark:bg-stone-900" />
                            ) : (
                              <div className="h-5 w-5 shrink-0 rounded-full border-2 border-stone-200 dark:border-stone-700 transition-colors group-hover:border-stone-500 dark:group-hover:border-stone-400 bg-white/50 dark:bg-stone-800/50" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-1 min-h-[140px] flex-col items-center justify-center gap-3 rounded-[1.5rem] bg-stone-50/50 dark:bg-stone-900/30 border border-dashed border-stone-200/80 dark:border-stone-700/80 text-center opacity-80 hover:opacity-100 transition-opacity">
                    <div className="rounded-[1rem] bg-white p-3 shadow-sm ring-1 ring-stone-200/50 dark:bg-stone-800 dark:ring-stone-700/50">
                      <CalendarPlus className="h-5 w-5 text-stone-400 dark:text-stone-500" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-stone-600 dark:text-stone-300">Nothing planned</p>
                      <a href={`/plan?date=${dayData.dateStr}`} className="mt-1 inline-block text-[11px] font-bold uppercase tracking-wider text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 active:scale-95 transition-transform">
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
