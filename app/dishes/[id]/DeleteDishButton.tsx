"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

export function DeleteDishButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onDelete = async () => {
    if (!confirm("Delete this dish? This cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dishes/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        alert("Failed to delete dish");
        return;
      }
      router.push("/recipes");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={loading}
      aria-label="Delete recipe"
      className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-500/20"
    >
      {loading ? <span className="text-xs">…</span> : <Trash2 className="h-5 w-5" aria-hidden />}
    </button>
  );
}

