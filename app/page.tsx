import BlurText from "@/app/components/motion/BlurText";
import Link from "next/link";
import { Logo } from "./components/Logo";
import { Suspense } from "react";
import { getSession } from "@/lib/supabaseServerClient";
import { getUserTimeZone } from "@/lib/userTimeZone";
import { ClearAuthErrorUrl } from "./components/ClearAuthErrorUrl";
import { MarkHomeVisited } from "./components/MarkHomeVisited";
import { WeeklyPlanOverview } from "./components/WeeklyPlanOverview";
import { BookOpen, CalendarHeart, ShoppingCart, Sparkles, Mic, Settings } from "lucide-react";

const features = [
  {
    href: "/recipes",
    title: "Recipes",
    description: "Your digital cookbook. Add dishes, ingredients, and photos. Filter by tag or favorites.",
    accent: "bg-saffron text-ink",
    icon: BookOpen,
  },
  {
    href: "/plan",
    title: "Planner",
    description: "The visual planner. Drag recipes onto breakfast, lunch, and dinner for each day.",
    accent: "bg-indigo text-white",
    icon: CalendarHeart,
  },
  {
    href: "/shopping-list",
    title: "List",
    description: "Automatic generation. Pick recipes and get one combined, categorized grocery list.",
    accent: "bg-chili text-white",
    icon: ShoppingCart,
  },
  {
    href: "/what-can-i-cook",
    title: "What can I cook?",
    description: "Magic matching. Enter what fresh ingredients you have and see matching recipes.",
    accent: "bg-leaf text-white",
    icon: Sparkles,
  },
];

type HomePageProps = {
  searchParams: Promise<{ error?: string; error_code?: string }>;
};

import { getTranslatedTagline, initialOf } from "@/lib/taglines";

export default async function HomePage({ searchParams }: HomePageProps) {
  const { user } = await getSession();
  const params = await searchParams;
  const expiredLink =
    params?.error === "access_denied" && params?.error_code === "otp_expired";
  const preferred = user?.preferred_name?.trim();
  const chefName = preferred || user?.email?.split("@")[0] || "Chef";
  const isFirstVisit = user ? !user.has_visited_home : false;
  const welcomePrefix = isFirstVisit ? "Welcome," : "Welcome back,";
  const tagline = getTranslatedTagline(user?.native_language);
  const todayLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: await getUserTimeZone() }).format(new Date());

  return (
    <div className="flex flex-col gap-6 pt-1 lg:gap-8">
      <Suspense fallback={null}>
        <ClearAuthErrorUrl />
      </Suspense>
      {expiredLink && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          That confirmation link has expired. Please{" "}
          <Link href="/login" className="font-medium text-amber-800 underline hover:no-underline dark:text-amber-300">
            log in
          </Link>{" "}
          or{" "}
          <Link href="/signup" className="font-medium text-amber-800 underline hover:no-underline dark:text-amber-300">
            sign up
          </Link>{" "}
          again to get a new link.
        </div>
      )}
      {user && (
        <div className="flex flex-col gap-5">
          {isFirstVisit && <MarkHomeVisited />}

          {/* Hero block: the Marathi question is the headline, with the greeting and settings above it. */}
          <section
            aria-labelledby="home-question"
            className="relative -mx-4 -mt-[max(0.75rem,env(safe-area-inset-top))] overflow-hidden rounded-b-[1.75rem] bg-indigo px-5 pb-14 pt-[max(1.25rem,calc(env(safe-area-inset-top)+0.75rem))] text-cream motion-safe:animate-[rise_380ms_cubic-bezier(0.2,0.8,0.2,1)_both] sm:mx-0 sm:mt-0 sm:rounded-4xl sm:border-2 sm:border-ink"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-saffron" />
            <div aria-hidden className="pointer-events-none absolute right-20 top-28 h-10 w-10 rounded-full bg-chili" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13px] font-extrabold uppercase tracking-wide text-saffron">{todayLabel}</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-cream/85">
                  {welcomePrefix} {preferred ? chefName : `Chef ${chefName}`}
                </p>
              </div>
              <Link
                href="/settings"
                aria-label="Settings"
                className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-cream text-lg font-extrabold text-ink shadow-md transition-transform active:scale-95"
              >
                <span aria-hidden className="leading-none">{initialOf(chefName)}</span>
                <span aria-hidden className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-ink bg-saffron text-ink">
                  <Settings className="h-3 w-3" strokeWidth={2.5} />
                </span>
              </Link>
            </div>
            <h1 id="home-question" className="relative mt-3 max-w-[11ch] font-mr text-[3.25rem] font-extrabold leading-[1.05] text-balance sm:text-6xl">
              <BlurText text={tagline} />
            </h1>
          </section>

          <ul className="relative z-10 -mt-12 grid grid-cols-3 gap-2.5">
            {[
              { href: "/shopping-list", label: "Groceries", icon: ShoppingCart, tone: "bg-saffron text-ink" },
              { href: "/dishes/new", label: "Add recipe", icon: BookOpen, tone: "bg-pink text-ink" },
              { href: "/dishes/new?mode=voice", label: "Speak it", icon: Mic, tone: "bg-leaf text-white" },
            ].map(({ href, label, icon: Icon, tone }) => (
              <li key={href} className="flex">
                <Link
                  href={href}
                  className={`flex min-h-[4.75rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-ink px-1 text-center text-sm font-extrabold leading-none whitespace-nowrap shadow-md press dark:border-stone-950 ${tone}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          {!user?.native_language && (
            <p className="-mt-1 text-sm font-semibold text-stone-700 dark:text-stone-300">
              Set your mother tongue in{" "}
              <Link href="/settings" className="inline-flex min-h-11 items-center font-extrabold underline decoration-2 underline-offset-2">
                Settings
              </Link>{" "}
              for personalised greetings.
            </p>
          )}

          <Suspense fallback={<div className="h-64 w-full rounded-2xl border-2 border-dashed border-stone-300 motion-safe:animate-pulse" />}>
            <WeeklyPlanOverview />
          </Suspense>
        </div>
      )}

      {!user && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden rounded-4xl border-2 border-ink bg-indigo px-5 py-10 text-cream shadow-xl sm:px-12 sm:py-20 lg:py-24">
            <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-saffron sm:h-72 sm:w-72" />
            <div aria-hidden className="pointer-events-none absolute bottom-8 left-6 h-10 w-10 rounded-full bg-chili" />
            <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-start sm:items-center sm:text-center">
              <Logo className="mb-5 h-16 w-16 shrink-0 sm:h-24 sm:w-24" />
              <p className="font-mr text-4xl font-extrabold leading-tight text-saffron sm:text-6xl">{tagline}</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-5xl">EatPlan</h2>
              <p className="mt-4 max-w-lg text-base font-medium leading-relaxed text-cream/90 sm:text-xl">
                Remove the pain of deciding what to eat every day. Plan meals, build shopping lists, and cook with what you have.
              </p>
              <Link
                href="/recipes"
                className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-saffron px-7 text-base font-extrabold text-ink shadow-md press"
              >
                Open your digital cookbook <span aria-hidden>→</span>
              </Link>
            </div>
          </section>

          {/* Features */}
          <section className="mx-auto w-full max-w-5xl">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-0.5 flex-1 bg-ink dark:bg-stone-600" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                Everything you need
              </h3>
              <div className="h-0.5 flex-1 bg-ink dark:bg-stone-600" />
            </div>

            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={f.href} className="flex">
                    <Link
                      href={f.href}
                      className="group flex w-full flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white p-6 shadow-md transition-transform hover:-translate-y-0.5 dark:border-stone-600 dark:bg-stone-900 sm:p-8"
                    >
                      <div
                        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink ${f.accent}`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2.5} />
                      </div>
                      <span className="mb-2 text-xl font-bold text-stone-900 dark:text-stone-50">
                        {f.title}
                      </span>
                      <span className="mb-6 flex-1 text-sm font-medium leading-relaxed text-stone-600 dark:text-stone-400">
                        {f.description}
                      </span>
                      <span className="mt-auto flex items-center gap-1.5 text-sm font-bold text-orange-600 dark:text-orange-400">
                        Let&apos;s go
                        <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      {/* Footer line */}
      <div className="flex justify-center pb-2">
        <p className="px-4 py-1 text-xs font-semibold tracking-wider text-stone-500 dark:text-stone-400">
          A MEAL PLANNER BY PP
        </p>
      </div>
    </div>
  );
}
