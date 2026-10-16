"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The signed-in home screen has its own greeting row (avatar + settings), so on phones the
 * global header card would just be an empty bar with a gear. Hide it there; keep it everywhere else.
 */
export function SiteHeader({ children, signedIn }: { children: ReactNode; signedIn: boolean }) {
  const pathname = usePathname();
  const hideOnPhone = signedIn && pathname === "/";
  return (
    <header
      className={`site-header relative z-50 mb-4 rounded-2xl glass-panel px-3 py-1.5 sm:px-4 sm:py-3 sticky top-[max(0.5rem,env(safe-area-inset-top))] sm:mb-8 lg:mb-10 transition-all duration-300 ${
        hideOnPhone ? "max-sm:hidden" : ""
      }`}
    >
      {children}
    </header>
  );
}
