"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, CalendarHeart, ShoppingCart } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/recipes", label: "Recipes", icon: BookOpen, also: ["/dishes"] },
  { href: "/plan", label: "Plan", icon: CalendarHeart },
  { href: "/shopping-list", label: "List", icon: ShoppingCart },
] as const;

/** Hidden on auth pages so the sign-in form gets the whole screen. */
const HIDE_ON = ["/login", "/signup"];

export function MobileNav() {
  const pathname = usePathname() ?? "/";
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      aria-label="Main"
      className="mobile-tabbar sm:hidden fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-100 rounded-[1.25rem] border-2 border-ink bg-ink p-1.5 shadow-md dark:border-stone-700"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch gap-1">
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
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[0.9rem] text-xs font-extrabold transition-colors active:scale-95 ${
                  isActive ? "bg-saffron text-ink" : "text-cream/80 hover:text-cream"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
