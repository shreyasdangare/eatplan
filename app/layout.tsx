import type { Metadata, Viewport } from "next";
import "./globals.css";
import { HeaderTitle } from "./components/HeaderTitle";
import { AuthLinks } from "./components/AuthLinks";

export const metadata: Metadata = {
  title: "काय खायचं? – Meal Planner",
  description: "Simple ingredient-based meal planning app"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true
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
          <header className="mb-4 border-b border-orange-200/70 pb-4 sm:mb-6 lg:mb-8 lg:pb-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <HeaderTitle />
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <nav
                  className="flex flex-wrap gap-1 sm:gap-2 text-sm"
                  aria-label="Main navigation"
                >
                  <a
                    href="/recipes"
                    title="Browse and manage your recipe collection"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80"
                  >
                    Recipes
                  </a>
                  <a
                    href="/plan"
                    title="Assign recipes to days and meals (breakfast, lunch, dinner)"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80"
                  >
                    This week
                  </a>
                  <a
                    href="/shopping-list"
                    title="Pick recipes and get one combined grocery list"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80"
                  >
                    Shopping list
                  </a>
                  <a
                    href="/pantry"
                    title="Ingredients you always have at home"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80"
                  >
                    Pantry
                  </a>
                  <a
                    href="/what-can-i-cook"
                    title="Enter what you have and see matching recipes"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80"
                  >
                    What can I cook?
                  </a>
                </nav>
                <AuthLinks />
              </div>
            </div>
          </header>
          <main className="flex-1 pb-8 min-h-0 lg:pb-12">{children}</main>
        </div>
      </body>
    </html>
  );
}

