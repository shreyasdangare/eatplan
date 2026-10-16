import { getSession } from "@/lib/supabaseServerClient";
import { supabaseServer } from "@/lib/supabaseServer";
import { getHouseholdId } from "@/lib/getHouseholdId";
import Link from "next/link";
import { Sun, Utensils, Moon, Plus, Check, ChevronRight, CalendarDays } from "lucide-react";
import { imageVariant } from "@/lib/imageSrc";
import { getUserTimeZone } from "@/lib/userTimeZone";

export const dynamic = "force-dynamic";

type Slot = "breakfast" | "lunch" | "dinner";
type PlanEntry = {
  id: string;
  date: string;
  slot_type: Slot;
  dishes?: { id: string; name: string; image_url?: string | null } | null;
};

const SLOTS: { key: Slot; label: string; icon: typeof Sun }[] = [
  { key: "breakfast", label: "Breakfast", icon: Sun },
  { key: "lunch", label: "Lunch", icon: Utensils },
  { key: "dinner", label: "Dinner", icon: Moon },
];

/** Today/tomorrow as YYYY-MM-DD in the user's own time zone, not the server's UTC. */
function upcoming(timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
  const now = new Date();
  const today = fmt.format(now);
  const tomorrow = fmt.format(new Date(now.getTime() + 86_400_000));
  const label = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(new Date(iso + "T12:00:00Z"));
  return { today, tomorrow, todayLabel: label(today, { weekday: "short", day: "numeric", month: "short" }), tomorrowLabel: label(tomorrow, { weekday: "short" }) };
}

const SLOT_ENDS_AT: Record<Slot, number> = { breakfast: 11, lunch: 15, dinner: 22 };

/** Has today's slot passed, judged on the user's clock (same cut-offs as lib/isMealPast). */
function slotPast(slot: Slot, timeZone: string): boolean {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", hourCycle: "h23" }).format(new Date()));
  return hour >= SLOT_ENDS_AT[slot];
}

export async function WeeklyPlanOverview() {
  const { user } = await getSession();
  if (!user) return null;
  const householdId = await getHouseholdId(user.id);
  if (!householdId) return null;

  const timeZone = await getUserTimeZone();
  const { today, tomorrow, todayLabel, tomorrowLabel } = upcoming(timeZone);
  const { data, error } = await supabaseServer
    .from("meal_plans")
    .select("id, date, slot_type, dish_id, dishes ( id, name, image_url )")
    .eq("household_id", householdId)
    .gte("date", today)
    .lte("date", tomorrow);
  if (error) {
    console.error("Failed to fetch plan preview:", error);
    return null;
  }

  const byDate: Record<string, Partial<Record<Slot, PlanEntry>>> = { [today]: {}, [tomorrow]: {} };
  for (const p of (data ?? []) as unknown as PlanEntry[]) if (byDate[p.date] && p.dishes) byDate[p.date][p.slot_type] = p;
  const todayPlan = byDate[today];
  const tomorrowPlan = byDate[tomorrow];
  const todayCount = SLOTS.filter((s) => todayPlan[s.key]).length;
  const tomorrowNames = SLOTS.map((s) => tomorrowPlan[s.key]?.dishes?.name).filter(Boolean) as string[];

  return (
    <section aria-labelledby="today-heading" className="motion-safe:animate-[rise_440ms_120ms_cubic-bezier(0.2,0.8,0.2,1)_both]">
      <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
        <div>
          <h2 id="today-heading" className="text-lg font-extrabold leading-tight tracking-tight text-stone-900 dark:text-stone-50">
            Today
          </h2>
          <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
            {todayLabel} · {todayCount === 0 ? "nothing planned yet" : `${todayCount} of 3 planned`}
          </p>
        </div>
        <Link
          href="/plan"
          className="-mr-2 flex min-h-11 items-center gap-1 rounded-full px-3 text-sm font-bold text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-stone-800"
        >
          <CalendarDays className="h-4 w-4" aria-hidden /> Week
        </Link>
      </div>

      <ul className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-[0_8px_28px_-18px_rgba(0,0,0,0.25)] divide-y divide-stone-100 dark:divide-stone-800 dark:border-stone-800 dark:bg-stone-900">
        {SLOTS.map(({ key, label, icon: Icon }) => {
          const entry = todayPlan[key];
          const past = slotPast(key, timeZone);
          if (entry?.dishes) {
            const thumb = entry.dishes.image_url ? imageVariant(entry.dishes.image_url, 250) ?? entry.dishes.image_url : null;
            return (
              <li key={key}>
                <Link href={`/dishes/${entry.dishes.id}`} className="flex min-h-[4.25rem] items-center gap-3 px-3.5 py-2.5 hover:bg-stone-50 dark:hover:bg-stone-800/60">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small CDN-sized thumbnail
                    <img src={thumb} alt="" loading="lazy" decoding="async" className={`h-12 w-12 shrink-0 rounded-2xl object-cover ${past ? "opacity-60 grayscale" : ""}`} />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</span>
                    <span className={`block truncate text-base font-bold ${past ? "text-stone-500 dark:text-stone-400" : "text-stone-900 dark:text-stone-50"}`}>
                      {entry.dishes.name}
                    </span>
                  </span>
                  {past ? (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" aria-label="Done">
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
                  )}
                </Link>
              </li>
            );
          }
          return (
            <li key={key}>
              <Link
                href={`/plan?date=${today}&add=${key}`}
                className={`group flex min-h-[4.25rem] items-center gap-3 px-3.5 py-2.5 hover:bg-orange-50/60 dark:hover:bg-stone-800/60`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-dashed border-stone-300 text-stone-500 transition-colors group-hover:border-orange-400 group-hover:text-orange-600 dark:border-stone-700 dark:text-stone-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</span>
                  <span className="block text-base font-semibold text-stone-700 dark:text-stone-200">
                    {past ? "Nothing planned" : "Pick a recipe"}
                  </span>
                </span>
                <span className="flex h-9 shrink-0 items-center gap-1 rounded-full bg-orange-100 px-3 text-sm font-bold text-orange-800 transition-colors group-hover:bg-orange-600 group-hover:text-white dark:bg-orange-500/15 dark:text-orange-200" aria-hidden>
                  <Plus className="h-4 w-4" strokeWidth={3} /> Add
                </span>
                <span className="sr-only">Add {label.toLowerCase()} for today</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href={`/plan?date=${tomorrow}`}
        className="mt-2.5 flex min-h-14 items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/70 px-4 py-2 hover:bg-white dark:border-stone-800 dark:bg-stone-900/60 dark:hover:bg-stone-900"
      >
        <span className="text-sm font-bold text-stone-900 dark:text-stone-50">Tomorrow</span>
        <span className="text-sm text-stone-500 dark:text-stone-400">{tomorrowLabel}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm font-medium text-stone-700 dark:text-stone-300">
          {tomorrowNames.length ? tomorrowNames.join(" · ") : "Plan ahead"}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-stone-400 dark:text-stone-500" aria-hidden />
      </Link>
    </section>
  );
}
