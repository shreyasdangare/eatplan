"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Plus, Wand2, PenLine, ChevronDown } from "lucide-react";

export function AddRecipeDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="group inline-flex shrink-0 min-h-[48px] items-center justify-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-all hover:bg-black hover:shadow-xl active:scale-95 dark:bg-orange-500 dark:hover:bg-orange-400"
      >
        <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" aria-hidden />
        <span>Add recipe</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl bg-white p-1.5 shadow-2xl ring-1 ring-black/5 focus:outline-none dark:bg-stone-800 dark:ring-white/10 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="py-1 space-y-1">
            <Link
              href="/dishes/new?mode=magic"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 hover:bg-orange-50 hover:text-orange-600 dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-orange-400"
            >
              <Wand2 className="h-4 w-4 text-stone-400 group-hover:text-orange-500" />
              Auto Import Magic
            </Link>
            <div className="h-px w-full bg-stone-100 dark:bg-stone-700/50" />
            <Link
              href="/dishes/new?mode=manual"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-stone-700 hover:bg-orange-50 hover:text-orange-600 dark:text-stone-200 dark:hover:bg-stone-700 dark:hover:text-orange-400"
            >
              <PenLine className="h-4 w-4 text-stone-400 group-hover:text-orange-500" />
              Enter Manually
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
