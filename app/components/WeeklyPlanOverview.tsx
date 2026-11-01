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

/** Sticker colours per meal, as in the design mockups (AA-checked against their text colour). */
const SLOT_PILL: Record<Slot, string> = {
  breakfast: "bg-saffron text-ink",
  lunch: "bg-leaf text-white",
  dinner: "bg-chili text-white",
};

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
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id="today-heading" className="text-2xl font-extrabold leading-tight tracking-tight text-ink dark:text-cream">
            Today&apos;s thali
          </h2>
          <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
            {todayLabel} · {todayCount === 0 ? "nothing planned yet" : `${todayCount} of 3 planned`}
          </p>
        </div>
        <Link
          href="/plan"
          className="flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-ink bg-white px-3 text-sm font-extrabold text-ink shadow-xs active:translate-x-px active:translate-y-px active:shadow-none dark:border-stone-600 dark:bg-stone-900 dark:text-cream"
        >
          <CalendarDays className="h-4 w-4" aria-hidden /> Week
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {SLOTS.map(({ key, label, icon: Icon }) => {
          const entry = todayPlan[key];
          const past = slotPast(key, timeZone);
          const pill = <span className={`inline-block rounded-full px-2 py-px text-[11px] font-extrabold uppercase tracking-wide ${SLOT_PILL[key]}`}>{label}</span>;
          const card =
            "flex min-h-[4.75rem] items-center gap-3 rounded-2xl border-2 border-ink bg-white p-2.5 shadow-md press dark:border-stone-600 dark:bg-stone-900";
          if (entry?.dishes) {
            const thumb = entry.dishes.image_url ? imageVariant(entry.dishes.image_url, 250) ?? entry.dishes.image_url : null;
            return (
              <li key={key}>
                <Link href={`/dishes/${entry.dishes.id}`} className={card}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small CDN-sized thumbnail
                    <img src={thumb} alt="" loading="lazy" decoding="async" className={`h-14 w-14 shrink-0 rounded-full border-2 border-ink object-cover dark:border-stone-600 ${past ? "opacity-60 grayscale" : ""}`} />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cream text-ink dark:border-stone-600 dark:bg-stone-800 dark:text-cream">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    {pill}
                    <span className={`mt-0.5 block truncate text-lg font-extrabold leading-tight ${past ? "text-stone-500 line-through decoration-2 dark:text-stone-400" : "text-ink dark:text-cream"}`}>
                      {entry.dishes.name}
                    </span>
                  </span>
                  {past ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-leaf text-white dark:border-stone-600" aria-label="Done">
                      <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <ChevronRight className="h-5 w-5 shrink-0 text-ink dark:text-cream" strokeWidth={2.5} aria-hidden />
                  )}
                </Link>
              </li>
            );
          }
          return (
            <li key={key}>
              <Link
                href={`/plan?date=${today}&add=${key}`}
                className="group flex min-h-[4.75rem] items-center gap-3 rounded-2xl border-2 border-dashed border-ink/40 p-2.5 hover:border-ink hover:bg-white dark:border-stone-600 dark:hover:bg-stone-900"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-ink/40 text-stone-600 dark:border-stone-600 dark:text-stone-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  {pill}
                  <span className="mt-0.5 block text-base font-bold text-stone-600 dark:text-stone-300">
                    {past ? "Nothing planned" : "Pick a recipe"}
                  </span>
                </span>
                <span className="flex h-11 shrink-0 items-center gap-1 rounded-xl border-2 border-ink bg-saffron px-3 text-sm font-extrabold text-ink dark:border-stone-600" aria-hidden>
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
        className="mt-4 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-ink bg-emerald-50 px-4 py-2.5 dark:border-stone-600 dark:bg-stone-900"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-extrabold uppercase tracking-wide text-leaf dark:text-emerald-100">Tomorrow · {tomorrowLabel}</span>
          <span className="block truncate text-base font-extrabold text-ink dark:text-cream">
            {tomorrowNames.length ? tomorrowNames.join(", ") : "Plan ahead"}
          </span>
        </span>
        <ChevronRight className="h-6 w-6 shrink-0 text-ink dark:text-cream" strokeWidth={2.5} aria-hidden />
      </Link>
    </section>
  );
}
