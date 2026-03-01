"use client";

import Link from "next/link";
import Image from "next/image";
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
      className="flex items-center gap-2 shrink-0 hover:opacity-90"
    >
      <Image
        src="/logo.png"
        alt="Jevan Meal Planner"
        width={40}
        height={40}
        className="h-10 w-10 rounded-lg object-contain"
      />
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight text-orange-900 dark:text-orange-200 sm:text-2xl leading-tight">
          काय खायचं?
        </h1>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          Meal planner by PP
        </span>
      </div>
    </Link>
  );
}
