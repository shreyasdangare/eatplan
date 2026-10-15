"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { usePathname } from "next/navigation";

export function HeaderTitle({ tagline = "काय खायचं?" }: { tagline?: string }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (isHome) {
    return <div className="shrink-0" />;
  }

  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2 shrink-0 rounded-xl hover:opacity-90"
      aria-label="EatPlan home"
    >
      <Logo aria-hidden className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-xs transition-transform group-hover:scale-105" />
      <div className="flex flex-col">
        <span className="text-xl font-semibold tracking-tight text-orange-900 dark:text-orange-200 sm:text-2xl leading-tight">
          EatPlan
        </span>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {tagline}
        </span>
      </div>
    </Link>
  );
}
