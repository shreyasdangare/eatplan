import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { ThemeToggle } from "./components/ThemeToggle";

export const metadata: Metadata = {
  title: "काय खायचं? – Meal Planner",
  description: "Simple ingredient-based meal planning app"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="mx-auto flex min-h-screen min-w-0 max-w-3xl flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-4 py-4 text-stone-900 sm:px-6 lg:max-w-5xl lg:px-10 lg:py-6 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 dark:text-stone-100">
            <header className="mb-6 border-b border-orange-200/70 dark:border-stone-600 pb-4 lg:mb-8 lg:pb-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  href="/"
                  className="flex items-baseline gap-2 shrink-0 hover:opacity-90"
                >
                  <h1 className="text-xl font-semibold tracking-tight text-orange-900 sm:text-2xl dark:text-orange-200">
                    काय खायचं?
                  </h1>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    Meal planner by PP
                  </span>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <ThemeToggle />
                  <nav
                    className="flex flex-wrap gap-2 text-sm"
                    aria-label="Main navigation"
                  >
                    <a
                      href="/recipes"
                      title="Browse and manage your recipe collection"
                      className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Recipes
                    </a>
                    <a
                      href="/plan"
                      title="Assign recipes to days and meals (breakfast, lunch, dinner)"
                      className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      This week
                    </a>
                    <a
                      href="/shopping-list"
                      title="Pick recipes and get one combined grocery list"
                      className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Shopping list
                    </a>
                    <a
                      href="/pantry"
                      title="Ingredients you always have at home"
                      className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Pantry
                    </a>
                    <a
                      href="/what-can-i-cook"
                      title="Enter what you have and see matching recipes"
                      className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      What can I cook?
                    </a>
                  </nav>
                </div>
              </div>
            </header>
            <main className="flex-1 pb-8 lg:pb-12">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

