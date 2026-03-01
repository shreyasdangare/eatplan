import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { HeaderTitle } from "./components/HeaderTitle";
import { AuthLinks } from "./components/AuthLinks";
import { DarkModeToggle } from "./components/DarkModeToggle";
import { InstallPrompt } from "./components/InstallPrompt";
import { AuthCodeExchange } from "./components/AuthCodeExchange";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "EatPlan – काय खायचं?",
  description: "Simple ingredient-based meal planning app"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#ea580c",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <AuthCodeExchange />
          </Suspense>
          <div className="mx-auto flex min-h-screen min-w-0 max-w-3xl flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-4 py-4 text-stone-900 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800 dark:text-stone-100 sm:px-6 lg:max-w-5xl lg:px-10 lg:py-6">
            <header className="mb-4 border-b border-orange-200/70 pb-4 dark:border-stone-700 sm:mb-6 lg:mb-8 lg:pb-6">
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
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Recipes
                    </a>
                    <a
                      href="/plan"
                      title="Assign recipes to days and meals (breakfast, lunch, dinner)"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      This week
                    </a>
                    <a
                      href="/shopping-list"
                      title="Pick recipes and get one combined grocery list"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Shopping list
                    </a>
                    <a
                      href="/pantry"
                      title="Ingredients you always have at home"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      Pantry
                    </a>
                    <a
                      href="/what-can-i-cook"
                      title="Enter what you have and see matching recipes"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
                    >
                      What can I cook?
                    </a>
                  </nav>
                  <DarkModeToggle />
                  <AuthLinks />
                </div>
              </div>
            </header>
            <InstallPrompt />
            <main className="flex-1 pb-8 min-h-0 lg:pb-12">{children}</main>
          </div>
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}

