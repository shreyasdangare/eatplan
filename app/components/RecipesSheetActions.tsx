"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RecipesSheetActions() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleDownload = () => {
    window.open("/api/recipes/export", "_blank", "noopener,noreferrer");
    setMessage(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setMessage({ type: "err", text: "Only .xlsx files are supported." });
      e.target.value = "";
      return;
    }
    setImporting(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/recipes/import", {
        method: "POST",
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({
          type: "err",
          text: data.error ?? `Import failed (${res.status})`
        });
        e.target.value = "";
        return;
      }
      const { imported = 0, updated = 0, errors = [] } = data;
      const parts = [];
      if (imported) parts.push(`${imported} imported`);
      if (updated) parts.push(`${updated} updated`);
      const summary = parts.length ? parts.join(", ") : "No changes";
      setMessage({
        type: "ok",
        text: errors.length > 0 ? `${summary}. Some rows had issues.` : `${summary}.`
      });
      router.refresh();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={handleDownload}
        disabled={importing}
        className="shrink-0 rounded-full border border-amber-700/40 bg-transparent px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-400/40 dark:text-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
      >
        Download recipes
      </button>
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          onChange={handleImport}
          disabled={importing}
          className="hidden"
          aria-label="Choose .xlsx file to import"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="shrink-0 rounded-full border border-amber-700/40 bg-transparent px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-400/40 dark:text-amber-200 dark:hover:bg-amber-900/50 disabled:opacity-50"
        >
          {importing ? "Importing…" : "Import from sheet"}
        </button>
      </div>
      {message && (
        <p
          className={`text-sm ${message.type === "err" ? "text-red-500 dark:text-red-400" : "text-amber-700 dark:text-amber-300"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
