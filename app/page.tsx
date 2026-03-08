import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { getSession } from "@/lib/supabaseServerClient";
import { ClearAuthErrorUrl } from "./components/ClearAuthErrorUrl";
import { MarkHomeVisited } from "./components/MarkHomeVisited";
import { BookOpen, CalendarHeart, ShoppingCart, Archive, Sparkles } from "lucide-react";

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
    title: "This week",
    description: "The visual planner. Drag recipes onto breakfast, lunch, and dinner for each day.",
    accent: "bg-amber-500",
    icon: CalendarHeart,
  },
  {
    href: "/shopping-list",
    title: "Shopping list",
    description: "Automatic generation. Pick recipes and get one combined, categorized grocery list.",
    accent: "bg-rose-500",
    icon: ShoppingCart,
  },
  {
    href: "/pantry",
    title: "Pantry",
    description: "Ingredients you always have. Used automatically when you search for what to cook.",
    accent: "bg-lime-500",
    icon: Archive,
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

export default async function HomePage({ searchParams }: HomePageProps) {
  const { user } = await getSession();
  const params = await searchParams;
  const expiredLink =
    params?.error === "access_denied" && params?.error_code === "otp_expired";
  const chefName =
    user?.preferred_name?.trim() || user?.email?.split("@")[0] || "Chef";
  const isFirstVisit = user && !user.has_visited_home;
  const welcomePrefix = isFirstVisit ? "Welcome," : "Welcome back,";

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
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
        <>
          {isFirstVisit && <MarkHomeVisited />}
          <p className="rounded-xl glass-panel px-4 py-3 text-center text-sm font-medium text-orange-900 dark:text-orange-200">
            👋 {welcomePrefix} <span className="font-bold">Chef {chefName}!</span>
          </p>
        </>
      )}
      
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-gradient-to-br from-orange-200/60 via-amber-100/50 to-rose-100/60 px-6 py-12 shadow-[0_20px_40px_-15px_rgba(234,88,12,0.15)] backdrop-blur-3xl dark:border-stone-700/50 dark:from-stone-800/80 dark:via-stone-800/60 dark:to-stone-700/80 dark:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] sm:px-12 sm:py-20 lg:py-24 group">
        <div className="relative z-10 flex flex-col items-center sm:items-start max-w-2xl text-center sm:text-left mx-auto sm:mx-0">
          <div className="mb-6 inline-flex h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-white/50 p-3 shadow-sm ring-1 ring-black/5 dark:bg-black/20 dark:ring-white/10 sm:h-28 sm:w-28 transition-transform duration-500 group-hover:scale-[1.02]">
            <Image
              src="/logo.png"
              alt="EatPlan"
              width={112}
              height={112}
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-6xl lg:text-7xl">
            EatPlan
          </h2>
          <p className="mt-2 text-xl font-medium tracking-wide text-orange-600 dark:text-orange-400 sm:text-2xl">
            काय खायचं?
          </p>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-xl">
            Remove the pain of deciding what to eat every day. Plan meals, build shopping lists, and cook with what you have.
          </p>
          <div className="mt-8">
            <Link
              href="/recipes"
              className="group/btn relative inline-flex min-h-[56px] items-center justify-center overflow-hidden rounded-full bg-stone-900 px-8 py-3 text-base font-semibold text-white shadow-xl transition-all hover:scale-105 hover:bg-black hover:shadow-2xl active:scale-95 dark:bg-orange-500 dark:hover:bg-orange-400"
            >
              <span className="relative z-10 flex items-center gap-2">
                Open your digital cookbook
                <span className="transition-transform group-hover/btn:translate-x-1">→</span>
              </span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
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
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
          <h3 className="text-sm font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            Everything you need
          </h3>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-stone-200 to-transparent dark:via-stone-700" />
        </div>
        
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <li key={f.href} className="flex">
                <Link
                  href={f.href}
                  className="group flex w-full flex-col overflow-hidden rounded-[2rem] glass-panel p-6 sm:p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(234,88,12,0.15)] dark:hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]"
                >
                  <div
                    className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${f.accent} bg-gradient-to-br from-white/20 to-transparent`}
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
                    Let's go 
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Footer line */}
      <div className="mt-8 pb-4 flex justify-center">
        <p className="rounded-full glass-panel px-4 py-2 text-xs font-semibold tracking-wider text-stone-500 dark:text-stone-400">
          A MEAL PLANNER BY PP 🇮🇳
        </p>
      </div>
    </div>
  );
}
