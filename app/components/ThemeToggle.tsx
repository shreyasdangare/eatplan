"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <span className="w-9 rounded-full border border-orange-200 px-2 py-1 text-[11px] text-amber-700 dark:border-stone-600 dark:text-amber-300">
        Theme
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full border border-orange-200 px-2 py-1 text-[11px] text-amber-700 hover:bg-orange-100 dark:border-stone-600 dark:text-amber-300 dark:hover:bg-stone-700"
      aria-label="Toggle dark mode"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
