"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { usePathname } from "next/navigation";

export function HeaderTitle() {
  const pathname = usePathname();
  const isHome = pathname === "/";


  return (
    <Link
      href="/"
      className="flex items-center gap-2 shrink-0 hover:opacity-90"
    >
      <Logo className="h-10 w-10 shrink-0 drop-shadow-sm transition-transform group-hover:scale-105" />
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight text-orange-900 dark:text-orange-200 sm:text-2xl leading-tight">
          EatPlan
        </h1>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          काय खायचं?
        </span>
      </div>
    </Link>
  );
}
