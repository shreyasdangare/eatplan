import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { HeaderTitle } from "./components/HeaderTitle";
import { SiteHeader } from "./components/SiteHeader";
import { AuthLinks } from "./components/AuthLinks";
import { InstallPrompt } from "./components/InstallPrompt";
import { AuthCodeExchange } from "./components/AuthCodeExchange";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { MobileNav } from "./components/MobileNav";
import { Toaster } from "./components/ui/Toast";
import { ServiceWorker } from "./components/ServiceWorker";
import { getSession } from "@/lib/supabaseServerClient";
import { getTranslatedTagline } from "@/lib/taglines";

const outfit = Outfit({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSession();
  const tagline = getTranslatedTagline(user?.native_language);

  return (
    <html lang="en" suppressHydrationWarning className={outfit.className}>
      <head>
        <link rel="preconnect" href="https://upload.wikimedia.org" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="EatPlan" />
      </head>
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <AuthCodeExchange />
          </Suspense>
          <div className="mx-auto flex min-h-dvh min-w-0 max-w-4xl flex-col px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:max-w-6xl lg:px-10 lg:py-6">
            <SiteHeader signedIn={!!user}>
              <div className="flex items-center justify-between gap-2">
                <HeaderTitle tagline={tagline} />
                <div className="flex items-center gap-2">
                  <nav
                    className="hidden sm:flex flex-wrap gap-1 sm:gap-1.5 text-sm"
                    aria-label="Main navigation"
                  >
                    <a
                      href="/recipes"
                      title="Browse and manage your recipe collection"
                      className="flex items-center justify-center rounded-xl px-4 py-2 font-medium text-stone-600 hover:bg-orange-500/10 hover:text-orange-600 active:scale-95 transition-all dark:text-stone-300 dark:hover:bg-orange-500/20 dark:hover:text-orange-300"
                    >
                      Recipes
                    </a>
                    <a
                      href="/plan"
                      title="Assign recipes to days and meals (breakfast, lunch, dinner)"
                      className="flex items-center justify-center rounded-xl px-4 py-2 font-medium text-stone-600 hover:bg-amber-500/10 hover:text-amber-600 active:scale-95 transition-all dark:text-stone-300 dark:hover:bg-amber-500/20 dark:hover:text-amber-300"
                    >
                      Planner
                    </a>
                    <a
                      href="/shopping-list"
                      title="Pick recipes and get one combined grocery list"
                      className="flex items-center justify-center rounded-xl px-4 py-2 font-medium text-stone-600 hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 transition-all dark:text-stone-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                    >
                      List
                    </a>
                    <div
                      title="Coming Soon"
                      className="hidden sm:flex items-center justify-center rounded-xl px-4 py-2 font-medium text-stone-500 dark:text-stone-400 cursor-not-allowed gap-2"
                    >
                      Cook?
                      {/* <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-none">Coming Soon</span> */}
                      <span className="inline-flex flex-col items-center rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight leading-tight text-center">
                        <span>Coming</span>
                        <span>Soon</span>
                      </span>
                    </div>
                  </nav>
                  <div className="flex shrink-0 items-center justify-center sm:border-l sm:pl-2 border-stone-200 dark:border-stone-700">
                    <AuthLinks />
                  </div>
                </div>
              </div>
            </SiteHeader>
            <InstallPrompt />
            <main id="main" className="flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:pb-8 min-h-0 lg:pb-12">{children}</main>
            <MobileNav />
            <Toaster />
            <ServiceWorker />
          </div>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
