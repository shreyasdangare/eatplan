"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarHeart, ShoppingCart, Archive, Sparkles } from "lucide-react";

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/recipes", label: "Recipes", icon: BookOpen, activeColor: "text-orange-600 dark:text-orange-400", activeBg: "bg-orange-100 dark:bg-orange-500/20" },
    { href: "/plan", label: "Planner", icon: CalendarHeart, activeColor: "text-amber-600 dark:text-amber-400", activeBg: "bg-amber-100 dark:bg-amber-500/20" },
    { href: "/shopping-list", label: "List", icon: ShoppingCart, activeColor: "text-rose-600 dark:text-rose-400", activeBg: "bg-rose-100 dark:bg-rose-500/20" },
    { href: "/pantry", label: "Pantry", icon: Archive, activeColor: "text-lime-600 dark:text-lime-400", activeBg: "bg-lime-100 dark:bg-lime-500/20" },
    { href: "/what-can-i-cook", label: "Cook?", icon: Sparkles, activeColor: "text-emerald-600 dark:text-emerald-400", activeBg: "bg-emerald-100 dark:bg-emerald-500/20" },
  ];

  return (
    <nav 
      className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] glass-panel border-t border-stone-200/60 dark:border-stone-800/60 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_-5px_30px_rgba(0,0,0,0.3)] transition-transform duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-center justify-around px-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          const isSoon = item.label === "Cook?";

          if (isSoon) {
            return (
              <li
                key={item.href}
                className={`flex flex-col items-center justify-center min-w-[4rem] h-full gap-1 transition-all opacity-60 cursor-not-allowed ${
                  isActive 
                    ? `${item.activeColor} font-bold` 
                    : "text-stone-500 font-medium"
                }`}
              >
                <div 
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                    isActive ? `${item.activeBg} scale-110` : "bg-transparent"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? "opacity-100" : "opacity-80 drop-shadow-sm"}`} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <div className="flex flex-col items-center mt-0.5">
                  <span className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter leading-none">Coming</span>
                  <span className="text-[7px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter leading-none mt-0.5">Soon</span>
                </div>
              </li>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[4rem] h-full gap-1 transition-all active:scale-95 ${
                isActive 
                  ? `${item.activeColor} font-bold` 
                  : "text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200 font-medium"
              }`}
            >
              <div 
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive ? `${item.activeBg} scale-110` : "bg-transparent hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "opacity-100" : "opacity-80 drop-shadow-sm"}`} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] leading-none tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
