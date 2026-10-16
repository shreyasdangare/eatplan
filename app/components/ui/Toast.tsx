"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

export type ToastInput = {
  message: string;
  /** Optional action, e.g. Undo or "View list". */
  action?: { label: string; onClick: () => void } | { label: string; href: string };
  tone?: "default" | "error";
  durationMs?: number;
};
type ToastItem = ToastInput & { id: number };

let items: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Show a short message above the tab bar. Returns a dismiss function. */
export function toast(input: ToastInput | string): () => void {
  const t: ToastItem = { ...(typeof input === "string" ? { message: input } : input), id: nextId++ };
  items = [...items.slice(-2), t];
  emit();
  return () => dismiss(t.id);
}

function dismiss(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function ToastRow({ t }: { t: ToastItem }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const ms = t.durationMs ?? (t.action ? 5000 : 3000);
    const timer = setTimeout(() => setLeaving(true), ms);
    return () => clearTimeout(timer);
  }, [t]);
  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => dismiss(t.id), 150);
    return () => clearTimeout(timer);
  }, [leaving, t.id]);

  return (
    <div
      className={`pointer-events-auto flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 py-2 text-[15px] font-medium shadow-[0_10px_30px_rgb(0_0_0/0.25)] transition-opacity duration-150 motion-safe:animate-[toast-in_180ms_ease-out] ${
        leaving ? "opacity-0" : "opacity-100"
      } ${t.tone === "error" ? "bg-red-700 text-white" : "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"}`}
    >
      <span className="min-w-0 flex-1">{t.message}</span>
      {t.action &&
        ("href" in t.action ? (
          <a
            href={t.action.href}
            className="-mr-2 flex min-h-11 shrink-0 items-center rounded-full px-3 font-bold text-orange-300 dark:text-orange-700"
          >
            {t.action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              (t.action as { onClick: () => void }).onClick();
              dismiss(t.id);
            }}
            className="-mr-2 flex min-h-11 shrink-0 items-center rounded-full px-3 font-bold text-orange-300 dark:text-orange-700"
          >
            {t.action.label}
          </button>
        ))}
    </div>
  );
}

const EMPTY: ToastItem[] = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribe, () => items, () => EMPTY);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-300 mx-auto flex max-w-md flex-col gap-2 px-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-6"
    >
      {list.map((t) => (
        <ToastRow key={t.id} t={t} />
      ))}
    </div>
  );
}
