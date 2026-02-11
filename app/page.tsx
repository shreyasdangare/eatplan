import Link from "next/link";

const features = [
  {
    href: "/recipes",
    title: "Recipes",
    description: "Your collection. Add dishes, ingredients, and photos. Filter by tag or favorites.",
    accent: "bg-orange-500",
    icon: "📖",
  },
  {
    href: "/plan",
    title: "This week",
    description: "Drag recipes onto breakfast, lunch, and dinner for each day.",
    accent: "bg-amber-500",
    icon: "📅",
  },
  {
    href: "/shopping-list",
    title: "Shopping list",
    description: "Pick recipes and get one combined grocery list.",
    accent: "bg-rose-500",
    icon: "🛒",
  },
  {
    href: "/pantry",
    title: "Pantry",
    description: "Ingredients you always have. Used automatically when you search.",
    accent: "bg-lime-500",
    icon: "🫙",
  },
  {
    href: "/what-can-i-cook",
    title: "What can I cook?",
    description: "Enter what you have and see matching recipes.",
    accent: "bg-emerald-500",
    icon: "✨",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-100/90 via-amber-50/95 to-rose-100/80 px-6 py-10 shadow-lg dark:border-stone-600 dark:from-stone-800 dark:via-stone-800/95 dark:to-stone-800">
        <div className="relative z-10">
          <h2 className="text-3xl font-bold tracking-tight text-orange-900 sm:text-4xl lg:text-5xl dark:text-orange-100">
            काय खायचं?
          </h2>
          <p className="mt-1 text-base text-amber-800 sm:text-lg dark:text-amber-200">
            What to eat?
          </p>
          <p className="mt-3 max-w-md text-sm text-stone-600 dark:text-stone-400">
            Plan your meals. Shop once. Cook with what you have.
          </p>
          <Link
            href="/recipes"
            className="mt-6 inline-block rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500"
          >
            Go to my recipes →
          </Link>
        </div>
        <div
          className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-orange-300/30 dark:bg-orange-500/20"
          aria-hidden
        />
        <div
          className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-rose-300/25 dark:bg-rose-500/15"
          aria-hidden
        />
      </section>

      {/* Features */}
      <section>
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          What you can do
        </h3>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.href}>
              <Link
                href={f.href}
                className="group flex h-full flex-col rounded-xl border border-orange-200/80 bg-white/80 p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md dark:border-stone-600 dark:bg-stone-800/80 dark:hover:border-stone-500"
              >
                <span
                  className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg text-xl ${f.accent} text-white`}
                >
                  {f.icon}
                </span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {f.title}
                </span>
                <span className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                  {f.description}
                </span>
                <span className="mt-2 text-xs font-medium text-orange-600 group-hover:underline dark:text-orange-400">
                  Open →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Footer line */}
      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        Meal planner by PP
      </p>
    </div>
  );
}
