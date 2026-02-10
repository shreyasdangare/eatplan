import type { Metadata } from "next";
import "./globals.css";

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
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-3">
          <header className="mb-4 flex items-center justify-between border-b border-orange-200/70 pb-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-orange-900">
                काय खायचं?
              </h1>
              <span className="text-[11px] text-amber-700">
                Meal planner by PP
              </span>
            </div>
            <nav className="flex gap-2 text-sm">
              <a
                href="/"
                className="rounded-full px-3 py-1 text-orange-900 hover:bg-orange-100"
              >
                Dishes
              </a>
              <a
                href="/what-can-i-cook"
                className="rounded-full px-3 py-1 text-orange-900 hover:bg-orange-100"
              >
                What can I cook?
              </a>
            </nav>
          </header>
          <main className="flex-1 pb-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

