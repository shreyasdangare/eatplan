"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ChefHat, ChevronLeft, Construction } from "lucide-react";

export default function CookModePage() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-8 pb-12 text-center">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-orange-100 via-amber-50 to-orange-100 shadow-lg dark:from-stone-800 dark:via-stone-800 dark:to-stone-700">
          <ChefHat className="h-12 w-12 text-orange-500 dark:text-orange-400" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 shadow-md">
          <Construction className="h-4 w-4 text-white" />
        </div>
      </div>

      <div className="space-y-3">
        <span className="inline-block rounded-full bg-amber-100 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Coming Soon
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
          Cooking Mode
        </h1>
        <p className="mx-auto max-w-md text-base font-medium text-stone-500 dark:text-stone-400">
          A hands-free, step-by-step cooking experience with wake-lock, voice
          control, and timer integration. We're cooking this up for you.
        </p>
      </div>

      <Link
        href={`/dishes/${id}`}
        className="group inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-black hover:shadow-xl active:scale-95 dark:bg-orange-500 dark:hover:bg-orange-400"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to recipe
      </Link>
    </div>
  );
}
