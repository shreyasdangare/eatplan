import type { Metadata } from "next";
import "./globals.css";
import { HeaderTitle } from "./components/HeaderTitle";
import { AuthLinks } from "./components/AuthLinks";

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
    <html lang="en">
      <body>
        <div className="mx-auto flex min-h-screen min-w-0 max-w-3xl flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-4 py-4 text-stone-900 sm:px-6 lg:max-w-5xl lg:px-10 lg:py-6">
          <header className="mb-6 border-b border-orange-200/70 pb-4 lg:mb-8 lg:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <HeaderTitle />
              <div className="flex flex-wrap items-center gap-2">
                <nav
                className="flex flex-wrap gap-2 text-sm"
                aria-label="Main navigation"
              >
                <a
                  href="/recipes"
                  title="Browse and manage your recipe collection"
                  className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100"
                >
                  Recipes
                </a>
                <a
                  href="/plan"
                  title="Assign recipes to days and meals (breakfast, lunch, dinner)"
                  className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100"
                >
                  This week
                </a>
                <a
                  href="/shopping-list"
                  title="Pick recipes and get one combined grocery list"
                  className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100"
                >
                  Shopping list
                </a>
                <a
                  href="/pantry"
                  title="Ingredients you always have at home"
                  className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100"
                >
                  Pantry
                </a>
                <a
                  href="/what-can-i-cook"
                  title="Enter what you have and see matching recipes"
                  className="rounded-full px-3 py-2 text-orange-900 hover:bg-orange-100"
                >
                  What can I cook?
                </a>
              </nav>
                <AuthLinks />
              </div>
            </div>
          </header>
          <main className="flex-1 pb-8 lg:pb-12">{children}</main>
        </div>
      </body>
    </html>
  );
}

