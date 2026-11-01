"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

export function AuthLinks({ signedIn }: { signedIn: boolean }) {
  if (signedIn) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800 transition-all hover:scale-110 active:scale-95"
          title="Account Settings"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full px-3 py-2.5 text-sm text-orange-900 hover:bg-orange-100 active:opacity-80 dark:text-orange-200 dark:hover:bg-stone-700"
    >
      Log in
    </Link>
  );
}
