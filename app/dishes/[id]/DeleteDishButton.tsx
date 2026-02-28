"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      className="rounded-full border border-red-500 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-60 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-500/20"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}

