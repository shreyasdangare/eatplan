"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, CalendarHeart, ShoppingCart, Archive } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/recipes", label: "Recipes", icon: BookOpen, also: ["/dishes"] },
  { href: "/plan", label: "Plan", icon: CalendarHeart },
  { href: "/shopping-list", label: "List", icon: ShoppingCart },
  { href: "/pantry", label: "Pantry", icon: Archive },
] as const;

/** Hidden on auth pages so the sign-in form gets the whole screen. */
const HIDE_ON = ["/login", "/signup"];

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Main"
      className="mobile-tabbar sm:hidden fixed inset-x-0 bottom-0 z-100 border-t border-stone-200/70 bg-white/90 backdrop-blur-xl shadow-[0_-8px_30px_rgb(0_0_0/0.06)] dark:border-stone-800/70 dark:bg-stone-950/90 pb-safe"
    >
      <ul className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname === item.href ||
                pathname.startsWith(item.href + "/") ||
                ("also" in item && item.also.some((p) => pathname.startsWith(p)));
          return (
            <li key={item.href} className="flex flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs transition-colors active:scale-95 ${
                  isActive
                    ? "font-bold text-orange-700 dark:text-orange-300"
                    : "font-medium text-stone-600 dark:text-stone-300"
                }`}
              >
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-orange-100 dark:bg-orange-500/20" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
