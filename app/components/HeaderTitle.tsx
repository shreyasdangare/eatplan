"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function HeaderTitle() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return <div className="shrink-0" />;
  }

  return (
    <Link
      href="/"
      className="flex items-baseline gap-2 shrink-0 hover:opacity-90"
    >
      <h1 className="text-xl font-semibold tracking-tight text-orange-900 sm:text-2xl dark:text-orange-200">
        काय खायचं?
      </h1>
      <span className="text-xs text-amber-700 dark:text-amber-300">
        Meal planner by PP
      </span>
    </Link>
  );
}
