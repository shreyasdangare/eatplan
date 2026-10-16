import Link from "next/link";
import { Plus } from "lucide-react";

/** Single entry point: /dishes/new handles links, dish names, photos and manual entry. */
export function AddRecipeDropdown() {
  return (
    <Link
      href="/dishes/new"
      className="group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-stone-900 px-6 text-sm font-bold text-white shadow-lg transition-all hover:bg-black active:scale-95 dark:bg-orange-600 dark:hover:bg-orange-700"
    >
      <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" aria-hidden />
      <span>Add recipe</span>
    </Link>
  );
}
