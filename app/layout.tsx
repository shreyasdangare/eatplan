import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jevan – Meal Planner",
  description: "Simple ingredient-based meal planning app"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-3">
          <header className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <h1 className="text-lg font-semibold tracking-tight">Jevan</h1>
            <nav className="flex gap-2 text-sm">
              <a href="/" className="rounded-full px-3 py-1 hover:bg-slate-800">
                Dishes
              </a>
              <a
                href="/what-can-i-cook"
                className="rounded-full px-3 py-1 hover:bg-slate-800"
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

