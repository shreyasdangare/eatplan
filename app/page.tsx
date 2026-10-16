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
    accent: "bg-orange-500",
    icon: BookOpen,
  },
  {
    href: "/plan",
    title: "Planner",
    description: "The visual planner. Drag recipes onto breakfast, lunch, and dinner for each day.",
    accent: "bg-amber-500",
    icon: CalendarHeart,
  },
  {
    href: "/shopping-list",
    title: "List",
    description: "Automatic generation. Pick recipes and get one combined, categorized grocery list.",
    accent: "bg-rose-500",
    icon: ShoppingCart,
  },
  {
    href: "/what-can-i-cook",
    title: "What can I cook?",
    description: "Magic matching. Enter what fresh ingredients you have and see matching recipes.",
    accent: "bg-emerald-500",
    icon: Sparkles,
  },
];

type HomePageProps = {
  searchParams: Promise<{ error?: string; error_code?: string }>;
};

import { getTranslatedTagline, getTranslatedWelcome, initialOf, languageToLocale } from "@/lib/taglines";

export default async function HomePage({ searchParams }: HomePageProps) {
  const { user } = await getSession();
  const params = await searchParams;
  const expiredLink =
    params?.error === "access_denied" && params?.error_code === "otp_expired";
  const preferred = user?.preferred_name?.trim();
  const chefName = preferred || user?.email?.split("@")[0] || "Chef";
  const isFirstVisit = user ? !user.has_visited_home : false;
  const welcomePrefix = getTranslatedWelcome(user?.native_language, isFirstVisit);
  const tagline = getTranslatedTagline(user?.native_language);
  const locale = languageToLocale(user?.native_language);
  const todayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: await getUserTimeZone() }).format(new Date());

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

          {/* Greeting row: replaces the header card on phones (no empty bar with a lone gear). */}
          <header className="flex items-center gap-3 pt-2 motion-safe:animate-[rise_380ms_cubic-bezier(0.2,0.8,0.2,1)_both]">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
                {welcomePrefix.replace(/,\s*$/, "")}
              </p>
              <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight text-stone-900 text-balance wrap-break-word dark:text-stone-50 sm:text-3xl">
                {preferred ? chefName : `Chef ${chefName}`}
              </h1>
            </div>
            <Link
              href="/settings"
              aria-label="Settings"
              className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-orange-500 to-rose-500 text-lg font-bold text-white shadow-md ring-4 ring-white transition-transform active:scale-95 dark:ring-stone-900"
            >
              <span aria-hidden className="leading-none">{initialOf(chefName)}</span>
              <span aria-hidden className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700">
                <Settings className="h-3 w-3" strokeWidth={2.5} />
              </span>
            </Link>
          </header>

          <section
            aria-labelledby="home-question"
            className="relative overflow-hidden rounded-3xl border border-orange-200/70 bg-linear-to-br from-orange-100 via-amber-50 to-rose-50 p-4 shadow-[0_16px_36px_-18px_rgba(234,88,12,0.35)] motion-safe:animate-[rise_420ms_60ms_cubic-bezier(0.2,0.8,0.2,1)_both] dark:border-stone-700/70 dark:from-stone-800 dark:via-stone-900 dark:to-stone-800 dark:shadow-none sm:rounded-4xl sm:p-6"
          >
            <div aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-300/30 blur-2xl dark:bg-orange-500/10" />
            <div className="relative flex items-center gap-3">
              <Logo aria-hidden className="h-11 w-11 shrink-0 drop-shadow-md" />
              <div className="min-w-0">
                <h2 id="home-question" className="text-xl font-extrabold leading-snug tracking-tight text-stone-900 dark:text-stone-50">
                  {tagline}
                </h2>
                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">{todayLabel}</p>
              </div>
            </div>
            <ul className="relative mt-4 grid grid-cols-3 gap-2">
              {[
                { href: "/shopping-list", label: "Groceries", icon: ShoppingCart, primary: true },
                { href: "/dishes/new", label: "Add recipe", icon: BookOpen },
                { href: "/dishes/new?mode=voice", label: "Speak it", icon: Mic },
              ].map(({ href, label, icon: Icon, primary }) => (
                <li key={href} className="flex">
                  <Link
                    href={href}
                    className={`flex min-h-[4.5rem] w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1 text-center text-[13px] font-bold leading-none whitespace-nowrap transition-transform active:scale-95 ${
                      primary
                        ? "bg-orange-600 text-white shadow-md shadow-orange-600/25 hover:bg-orange-700"
                        : "bg-white/85 text-stone-900 shadow-xs ring-1 ring-stone-900/5 hover:bg-white dark:bg-stone-900/70 dark:text-stone-50 dark:ring-white/10"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            {!user?.native_language && (
              <p className="relative mt-3 text-sm font-medium text-orange-950 dark:text-orange-100">
                Set your mother tongue in{" "}
                <Link href="/settings" className="inline-flex min-h-11 items-center font-bold underline underline-offset-2">
                  Settings
                </Link>{" "}
                for personalised greetings.
              </p>
            )}
          </section>

          <Suspense fallback={<div className="h-64 w-full rounded-3xl glass-panel motion-safe:animate-pulse" />}>
            <WeeklyPlanOverview />
          </Suspense>
        </div>
      )}

      {!user && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden rounded-4xl sm:rounded-[2.5rem] border border-white/40 bg-linear-to-br from-orange-200/60 via-amber-100/50 to-rose-100/60 px-5 py-10 shadow-[0_20px_40px_-15px_rgba(234,88,12,0.15)] backdrop-blur-3xl dark:border-stone-700/50 dark:from-stone-800/80 dark:via-stone-800/60 dark:to-stone-700/80 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] sm:px-12 sm:py-20 lg:py-24 group">
            <div className="relative z-10 flex flex-col items-center text-center mx-auto max-w-2xl">
              <Logo className="mb-4 sm:mb-6 h-20 w-20 shrink-0 drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-rotate-2 sm:h-40 sm:w-40" />
              <h2 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-6xl lg:text-7xl">
                EatPlan
              </h2>
              <p className="mt-2 text-xl font-medium tracking-wide text-orange-600 dark:text-orange-400 sm:text-2xl">
                {tagline}
              </p>
              <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-xl">
                Remove the pain of deciding what to eat every day. Plan meals, build shopping lists, and cook with what you have.
              </p>
              <div className="mt-8">
                <Link
                  href="/recipes"
                  className="group/btn relative inline-flex min-h-[56px] items-center justify-center overflow-hidden rounded-full bg-stone-900 px-8 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-black hover:shadow-2xl active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Open your digital cookbook
                    <span className="transition-transform group-hover/btn:translate-x-1">→</span>
                  </span>
                  <div className="absolute inset-0 z-0 bg-linear-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                </Link>
              </div>
            </div>

            {/* Decorative Blobs */}
            <div
              className="absolute right-[-10%] top-[-20%] h-[500px] w-[500px] rounded-full bg-orange-400/20 mix-blend-multiply blur-3xl transition-transform duration-1000 ease-in-out group-hover:scale-110 dark:bg-orange-500/10 dark:mix-blend-screen"
              aria-hidden
            />
            <div
              className="absolute bottom-[-10%] right-[10%] h-[300px] w-[300px] rounded-full bg-rose-400/20 mix-blend-multiply blur-3xl transition-transform duration-1000 ease-in-out delay-75 group-hover:scale-110 dark:bg-rose-500/10 dark:mix-blend-screen"
              aria-hidden
            />
          </section>

          {/* Features */}
          <section className="mx-auto w-full max-w-5xl">
            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                Everything you need
              </h3>
              <div className="h-px flex-1 bg-linear-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
            </div>

            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <li key={f.href} className="flex">
                    <Link
                      href={f.href}
                      className="group flex w-full flex-col overflow-hidden rounded-4xl glass-panel p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(234,88,12,0.15)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                    >
                      <div
                        className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${f.accent} bg-linear-to-br from-white/20 to-transparent`}
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
          A MEAL PLANNER BY PP 🇮🇳
        </p>
      </div>
    </div>
  );
}
